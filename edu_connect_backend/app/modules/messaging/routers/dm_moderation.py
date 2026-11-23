"""DM blocking and abuse-reporting endpoints."""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.access import assert_school_is_active
from app.core.audit import record_audit_event
from app.core.middleware import role_may_call
from app.core.rate_limit import check_rate_limit
from app.core.rls import set_request_rls_context
from app.core.security import decode_token, get_current_user, session_rejection
from app.db.database import get_db
from app.models import (
    Class,
    ClassMember,
    ClassTeacher,
    ClassTemporaryAccess,
    Conversation,
    ConversationParticipant,
    ConversationType,
    DirectMessage,
    MessageBlock,
    MessageReport,
    StudentParent,
    User,
    UserRole,
)
from app.modules.demo.access import DEMO_READ_ONLY_MESSAGE, is_read_only_demo_user
from app.ws_manager import manager

from .dm_shared import (
    CreateMessageReportRequest,
    MessageBlockOut,
    MessageReportOut,
    UpdateMessageReportRequest,
    _ADMIN_ROLES,
    _REPORT_REASONS,
    _REPORT_STATUSES,
    _assert_participant,
)

router = APIRouter()


@router.get("/blocks", response_model=list[MessageBlockOut])
async def list_message_blocks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MessageBlock)
        .where(
            MessageBlock.school_id == current_user.school_id,
            MessageBlock.blocker_id == current_user.id,
        )
        .order_by(MessageBlock.created_at.desc())
    )
    return result.scalars().all()


@router.post("/blocks/{blocked_user_id}", response_model=MessageBlockOut, status_code=201)
async def block_message_user(
    blocked_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="Utilisateur non assigne a un etablissement.")
    if blocked_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous bloquer vous-meme.")

    user_res = await db.execute(
        select(User).where(
            User.id == blocked_user_id,
            User.school_id == current_user.school_id,
        )
    )
    blocked_user = user_res.scalar_one_or_none()
    if not blocked_user or blocked_user.school_id != current_user.school_id:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if blocked_user.role in _ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Les comptes administratifs ne peuvent pas etre bloques.")

    existing_res = await db.execute(
        select(MessageBlock).where(
            MessageBlock.school_id == current_user.school_id,
            MessageBlock.blocker_id == current_user.id,
            MessageBlock.blocked_user_id == blocked_user_id,
        )
    )
    existing = existing_res.scalar_one_or_none()
    if existing:
        return existing

    block = MessageBlock(
        id=str(uuid.uuid4()),
        school_id=current_user.school_id,
        blocker_id=current_user.id,
        blocked_user_id=blocked_user_id,
    )
    db.add(block)
    await record_audit_event(
        db,
        action="dm.user_blocked",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="message_block",
        resource_id=block.id,
        metadata={"blocked_user_id": blocked_user_id},
    )
    await db.commit()
    await db.refresh(block)
    return block


@router.delete("/blocks/{blocked_user_id}")
async def unblock_message_user(
    blocked_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MessageBlock).where(
            MessageBlock.school_id == current_user.school_id,
            MessageBlock.blocker_id == current_user.id,
            MessageBlock.blocked_user_id == blocked_user_id,
        )
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Blocage introuvable.")

    await db.delete(block)
    await record_audit_event(
        db,
        action="dm.user_unblocked",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="message_block",
        resource_id=block.id,
        metadata={"blocked_user_id": blocked_user_id},
    )
    await db.commit()
    return {"status": "success"}


@router.post("/conversations/{conversation_id}/reports", response_model=MessageReportOut, status_code=201)
async def report_conversation_message(
    conversation_id: str,
    req: CreateMessageReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _assert_participant(current_user, conversation_id, db)
    reason = req.reason.strip().lower()
    if reason not in _REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Motif de signalement invalide.")
    if req.reported_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous signaler vous-meme.")

    participant_res = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.school_id == conv.school_id,
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == req.reported_user_id,
        )
    )
    if not participant_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="L'utilisateur signale ne participe pas a cette conversation.")

    if req.message_id:
        message_res = await db.execute(
            select(DirectMessage).where(
                DirectMessage.school_id == conv.school_id,
                DirectMessage.id == req.message_id,
                DirectMessage.conversation_id == conversation_id,
            )
        )
        message = message_res.scalar_one_or_none()
        if not message:
            raise HTTPException(status_code=404, detail="Message introuvable.")
        if message.sender_id != req.reported_user_id:
            raise HTTPException(status_code=400, detail="Le message signale ne vient pas de cet utilisateur.")

    report = MessageReport(
        id=str(uuid.uuid4()),
        school_id=conv.school_id,
        reporter_id=current_user.id,
        reported_user_id=req.reported_user_id,
        conversation_id=conversation_id,
        message_id=req.message_id,
        reason=reason,
        details=req.details.strip() if req.details else None,
    )
    db.add(report)
    await record_audit_event(
        db,
        action="dm.report_created",
        actor=current_user,
        school_id=conv.school_id,
        resource_type="message_report",
        resource_id=report.id,
        metadata={
            "conversation_id": conversation_id,
            "message_id": req.message_id,
            "reported_user_id": req.reported_user_id,
            "reason": reason,
        },
    )
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/reports", response_model=list[MessageReportOut])
async def list_message_reports(
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Reserve a l'administration.")
    if status_filter and status_filter not in _REPORT_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide.")

    stmt = select(MessageReport)
    if current_user.role != UserRole.system_admin:
        stmt = stmt.where(MessageReport.school_id == current_user.school_id)
    if status_filter:
        stmt = stmt.where(MessageReport.status == status_filter)

    result = await db.execute(stmt.order_by(MessageReport.created_at.desc()).limit(limit))
    return result.scalars().all()


@router.patch("/reports/{report_id}", response_model=MessageReportOut)
async def update_message_report(
    report_id: str,
    req: UpdateMessageReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Reserve a l'administration.")
    status_value = req.status.strip().lower()
    if status_value not in _REPORT_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide.")

    stmt = select(MessageReport).where(MessageReport.id == report_id)
    if current_user.role != UserRole.system_admin:
        stmt = stmt.where(MessageReport.school_id == current_user.school_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Signalement introuvable.")

    report.status = status_value
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.now(timezone.utc)
    await record_audit_event(
        db,
        action="dm.report_reviewed",
        actor=current_user,
        school_id=report.school_id,
        resource_type="message_report",
        resource_id=report.id,
        metadata={"status": status_value},
    )
    await db.commit()
    await db.refresh(report)
    return report
