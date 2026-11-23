"""DM contact discovery endpoints."""
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
    ContactClassOut,
    ContactOut,
    _filter_blocked_contacts,
)

router = APIRouter()


@router.get("/contacts", response_model=list[ContactOut])
async def list_dm_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return only the users the current account is allowed to message.

    Rules:
      - Teacher   → parents of students in their classes + principal + secretary
      - Parent    → teachers of their children + principal + secretary
      - Principal/Secretary → all users in the school
    """
    if not current_user.school_id and current_user.role != UserRole.system_admin:
        return []

    role = current_user.role
    school_id = current_user.school_id

    if role == UserRole.teacher:
        # Parents of students in the teacher's classes
        parents_stmt = (
            select(User)
            .join(StudentParent, StudentParent.parent_id == User.id)
            .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
            .join(ClassTeacher, ClassTeacher.class_id == ClassMember.class_id)
            .where(
                User.school_id == school_id,
                StudentParent.school_id == school_id,
                ClassMember.school_id == school_id,
                ClassTeacher.school_id == school_id,
                ClassTeacher.teacher_id == current_user.id,
                User.id != current_user.id,
            )
            .distinct()
        )
        # Admin (principal + secretary) of the same school
        admin_stmt = (
            select(User)
            .where(
                User.school_id == school_id,
                User.role.in_([UserRole.principal, UserRole.secretary]),
            )
        )
        now = datetime.now(timezone.utc)
        temp_parents_stmt = (
            select(User)
            .join(StudentParent, StudentParent.parent_id == User.id)
            .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
            .join(ClassTemporaryAccess, ClassTemporaryAccess.class_id == ClassMember.class_id)
            .where(
                User.school_id == school_id,
                StudentParent.school_id == school_id,
                ClassMember.school_id == school_id,
                ClassTemporaryAccess.user_id == current_user.id,
                ClassTemporaryAccess.school_id == school_id,
                ClassTemporaryAccess.starts_at <= now,
                ClassTemporaryAccess.expires_at >= now,
                User.id != current_user.id,
            )
            .distinct()
        )
        parents_res = await db.execute(parents_stmt)
        temp_parents_res = await db.execute(temp_parents_stmt)
        admin_res = await db.execute(admin_stmt)
        contact_map = {
            user.id: user
            for user in (
                list(parents_res.scalars().unique().all())
                + list(temp_parents_res.scalars().unique().all())
                + list(admin_res.scalars().unique().all())
            )
        }
        contacts = sorted(contact_map.values(), key=lambda u: u.full_name)

    elif role == UserRole.parent:
        # Teachers of the parent's children
        teachers_stmt = (
            select(User)
            .join(ClassTeacher, ClassTeacher.teacher_id == User.id)
            .join(ClassMember, ClassMember.class_id == ClassTeacher.class_id)
            .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
            .where(
                User.school_id == school_id,
                ClassTeacher.school_id == school_id,
                ClassMember.school_id == school_id,
                StudentParent.school_id == school_id,
                StudentParent.parent_id == current_user.id,
                User.id != current_user.id,
            )
            .distinct()
        )
        # Admin (principal + secretary) of the same school
        admin_stmt = (
            select(User)
            .where(
                User.school_id == school_id,
                User.role.in_([UserRole.principal, UserRole.secretary]),
            )
        )
        now = datetime.now(timezone.utc)
        temp_teachers_stmt = (
            select(User)
            .join(ClassTemporaryAccess, ClassTemporaryAccess.user_id == User.id)
            .join(ClassMember, ClassMember.class_id == ClassTemporaryAccess.class_id)
            .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
            .where(
                User.school_id == school_id,
                ClassMember.school_id == school_id,
                StudentParent.school_id == school_id,
                StudentParent.parent_id == current_user.id,
                ClassTemporaryAccess.school_id == school_id,
                ClassTemporaryAccess.starts_at <= now,
                ClassTemporaryAccess.expires_at >= now,
                User.id != current_user.id,
            )
            .distinct()
        )
        teachers_res = await db.execute(teachers_stmt)
        temp_teachers_res = await db.execute(temp_teachers_stmt)
        admin_res = await db.execute(admin_stmt)
        contact_map = {
            user.id: user
            for user in (
                list(teachers_res.scalars().unique().all())
                + list(temp_teachers_res.scalars().unique().all())
                + list(admin_res.scalars().unique().all())
            )
        }
        contacts = sorted(contact_map.values(), key=lambda u: u.full_name)

    elif role in [UserRole.principal, UserRole.secretary]:
        stmt = (
            select(User)
            .where(
                User.school_id == school_id,
                User.id != current_user.id,
                User.role.in_([
                    UserRole.parent,
                    UserRole.teacher,
                    UserRole.principal,
                    UserRole.secretary,
                ]),
            )
            .order_by(User.full_name.asc())
        )
        result = await db.execute(stmt)
        contacts = result.scalars().unique().all()
    else:
        return []

    contacts = [user for user in contacts if user.deactivated_at is None]
    contacts = await _filter_blocked_contacts(current_user, contacts, db)
    classes_by_user = await _load_contact_classes(current_user, contacts, db)
    return [
        ContactOut(
            user_id=user.id,
            full_name=user.full_name,
            role=user.role.value,
            email=user.email,
            classes=classes_by_user.get(user.id, []),
        )
        for user in contacts
    ]


async def _load_contact_classes(
    current_user: User,
    contacts: list[User],
    db: AsyncSession,
) -> dict[str, list[ContactClassOut]]:
    """Map each contact user_id to the school classes linking them to current_user."""
    school_id = current_user.school_id
    if not contacts or not school_id or not hasattr(db, "execute"):
        return {}

    try:
        now = datetime.now(timezone.utc)
        allowed_class_ids: set[str] | None = None
        if current_user.role == UserRole.teacher:
            taught_res = await db.execute(
                select(ClassTeacher.class_id).where(
                    ClassTeacher.school_id == school_id,
                    ClassTeacher.teacher_id == current_user.id,
                )
            )
            temp_res = await db.execute(
                select(ClassTemporaryAccess.class_id).where(
                    ClassTemporaryAccess.school_id == school_id,
                    ClassTemporaryAccess.user_id == current_user.id,
                    ClassTemporaryAccess.starts_at <= now,
                    ClassTemporaryAccess.expires_at >= now,
                )
            )
            allowed_class_ids = set(taught_res.scalars().all()) | set(temp_res.scalars().all())
        elif current_user.role == UserRole.parent:
            child_cls_res = await db.execute(
                select(ClassMember.class_id)
                .join(StudentParent, StudentParent.student_id == ClassMember.student_id)
                .where(
                    ClassMember.school_id == school_id,
                    StudentParent.school_id == school_id,
                    StudentParent.parent_id == current_user.id,
                )
            )
            allowed_class_ids = set(child_cls_res.scalars().all())

        if allowed_class_ids is not None and not allowed_class_ids:
            return {}

        by_user: dict[str, dict[str, str]] = {}

        parent_ids = [u.id for u in contacts if u.role == UserRole.parent]
        if parent_ids:
            parent_stmt = (
                select(StudentParent.parent_id, Class.id, Class.name)
                .join(ClassMember, ClassMember.student_id == StudentParent.student_id)
                .join(Class, Class.id == ClassMember.class_id)
                .where(
                    StudentParent.school_id == school_id,
                    ClassMember.school_id == school_id,
                    Class.school_id == school_id,
                    StudentParent.parent_id.in_(parent_ids),
                )
            )
            if allowed_class_ids is not None:
                parent_stmt = parent_stmt.where(Class.id.in_(allowed_class_ids))
            for uid, cid, cname in (await db.execute(parent_stmt)).all():
                by_user.setdefault(uid, {})[cid] = cname

        teacher_ids = [u.id for u in contacts if u.role == UserRole.teacher]
        if teacher_ids:
            teacher_stmt = (
                select(ClassTeacher.teacher_id, Class.id, Class.name)
                .join(Class, Class.id == ClassTeacher.class_id)
                .where(
                    ClassTeacher.school_id == school_id,
                    Class.school_id == school_id,
                    ClassTeacher.teacher_id.in_(teacher_ids),
                )
            )
            if allowed_class_ids is not None:
                teacher_stmt = teacher_stmt.where(Class.id.in_(allowed_class_ids))
            for uid, cid, cname in (await db.execute(teacher_stmt)).all():
                by_user.setdefault(uid, {})[cid] = cname

            temp_teacher_stmt = (
                select(ClassTemporaryAccess.user_id, Class.id, Class.name)
                .join(Class, Class.id == ClassTemporaryAccess.class_id)
                .where(
                    ClassTemporaryAccess.school_id == school_id,
                    Class.school_id == school_id,
                    ClassTemporaryAccess.user_id.in_(teacher_ids),
                    ClassTemporaryAccess.starts_at <= now,
                    ClassTemporaryAccess.expires_at >= now,
                )
            )
            if allowed_class_ids is not None:
                temp_teacher_stmt = temp_teacher_stmt.where(Class.id.in_(allowed_class_ids))
            for uid, cid, cname in (await db.execute(temp_teacher_stmt)).all():
                by_user.setdefault(uid, {})[cid] = cname

        return {
            uid: [
                ContactClassOut(id=cid, name=cname)
                for cid, cname in sorted(class_map.items(), key=lambda item: item[1])
            ]
            for uid, class_map in by_user.items()
        }
    except Exception:
        return {}
