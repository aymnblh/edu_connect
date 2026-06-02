import mimetypes
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import (
    assert_class_read_access,
    assert_class_write_access,
    assert_parent_linked_to_student,
)
from app.core.config import settings
from app.core.malware_scan import scan_upload
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import (
    Attendance,
    ConversationParticipant,
    DirectMessage,
    Grade,
    Homework,
    MediaAttachment,
    Message,
    Remark,
    User,
    UserRole,
)
from app.modules.messaging.routers.chat import _can_view_message

router = APIRouter(prefix="/media/attachments", tags=["Media"])

ALLOWED_PARENT_TYPES = {
    "homework",
    "grade",
    "attendance",
    "remark",
    "message",
    "direct_message",
}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class MediaAttachmentOut(BaseModel):
    id: str
    school_id: str
    uploaded_by: str | None = None
    parent_type: str
    parent_id: str
    original_filename: str | None = None
    mime_type: str | None = None
    size_bytes: int | None = None
    deleted_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


def _safe_suffix(filename: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()
    if len(suffix) > 12 or any(char in suffix for char in ("/", "\\", "\x00")):
        return ""
    return suffix


def _storage_root() -> Path:
    return Path(settings.media_storage_path).resolve()


def _storage_path(storage_key: str) -> Path:
    root = _storage_root()
    resolved = (root / storage_key).resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid media storage key.")
    return resolved


async def _assert_direct_message_access(
    message: DirectMessage,
    current_user: User,
    db: AsyncSession,
    *,
    write: bool,
) -> None:
    if current_user.role != UserRole.system_admin and message.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    participant_res = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.school_id == message.school_id,
            ConversationParticipant.conversation_id == message.conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
    )
    if not participant_res.scalar_one_or_none() and current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation.")

    if write and message.sender_id != current_user.id and current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Only the sender can attach files to this message.")


async def _assert_class_message_access(
    message: Message,
    current_user: User,
    db: AsyncSession,
    *,
    write: bool,
) -> None:
    await assert_class_read_access(message.class_id, current_user, db)
    if not _can_view_message(message, current_user):
        raise HTTPException(status_code=403, detail="Access denied.")

    if write and message.sender_id != current_user.id and current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Only the sender can attach files to this message.")


async def _assert_parent_record_access(record, current_user: User, db: AsyncSession, *, write: bool) -> None:
    if write:
        cls = await assert_class_write_access(record.class_id, current_user, db)
        if record.school_id != cls.school_id:
            raise HTTPException(status_code=403, detail="Access denied.")
        return

    cls = await assert_class_read_access(record.class_id, current_user, db)
    if record.school_id != cls.school_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if current_user.role == UserRole.parent:
        await assert_parent_linked_to_student(record.student_id, current_user.id, db, school_id=cls.school_id)
        if isinstance(record, Grade) and not record.is_approved:
            raise HTTPException(status_code=403, detail="Grade is not approved yet.")


async def _assert_parent_access(
    parent_type: str,
    parent_id: str,
    current_user: User,
    db: AsyncSession,
    *,
    write: bool,
) -> str:
    normalized_type = parent_type.strip().lower()
    if normalized_type not in ALLOWED_PARENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported attachment parent type.")

    if normalized_type == "homework":
        record = await db.get(Homework, parent_id)
        if not record:
            raise HTTPException(status_code=404, detail="Homework not found.")
        if write:
            cls = await assert_class_write_access(record.class_id, current_user, db)
        else:
            cls = await assert_class_read_access(record.class_id, current_user, db)
        if record.school_id != cls.school_id:
            raise HTTPException(status_code=403, detail="Access denied.")
        return record.school_id

    if normalized_type == "grade":
        record = await db.get(Grade, parent_id)
        if not record:
            raise HTTPException(status_code=404, detail="Grade not found.")
        await _assert_parent_record_access(record, current_user, db, write=write)
        return record.school_id

    if normalized_type == "attendance":
        record = await db.get(Attendance, parent_id)
        if not record:
            raise HTTPException(status_code=404, detail="Attendance record not found.")
        await _assert_parent_record_access(record, current_user, db, write=write)
        return record.school_id

    if normalized_type == "remark":
        record = await db.get(Remark, parent_id)
        if not record:
            raise HTTPException(status_code=404, detail="Remark not found.")
        await _assert_parent_record_access(record, current_user, db, write=write)
        return record.school_id

    if normalized_type == "message":
        record = await db.get(Message, parent_id)
        if not record:
            raise HTTPException(status_code=404, detail="Class message not found.")
        await _assert_class_message_access(record, current_user, db, write=write)
        return record.school_id

    record = await db.get(DirectMessage, parent_id)
    if not record:
        raise HTTPException(status_code=404, detail="Direct message not found.")
    await _assert_direct_message_access(record, current_user, db, write=write)
    return record.school_id


async def _load_authorized_attachment(
    attachment_id: str,
    current_user: User,
    db: AsyncSession,
    *,
    write: bool = False,
) -> MediaAttachment:
    attachment = await db.get(MediaAttachment, attachment_id)
    if not attachment or attachment.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    parent_school_id = await _assert_parent_access(
        attachment.parent_type,
        attachment.parent_id,
        current_user,
        db,
        write=write,
    )
    if attachment.school_id != parent_school_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return attachment


async def _read_upload(file: UploadFile) -> bytes:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > settings.media_max_upload_bytes:
        raise HTTPException(status_code=413, detail="Uploaded file is too large.")

    content_type = (file.content_type or mimetypes.guess_type(file.filename or "")[0] or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    return content


@router.post("/", response_model=MediaAttachmentOut, status_code=201)
async def upload_attachment(
    parent_type: str = Form(...),
    parent_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    normalized_type = parent_type.strip().lower()
    school_id = await _assert_parent_access(normalized_type, parent_id, current_user, db, write=True)
    content = await _read_upload(file)
    content_type = (file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream").lower()
    await scan_upload(content, filename=file.filename, content_type=content_type)

    attachment_id = str(uuid.uuid4())
    suffix = _safe_suffix(file.filename)
    storage_key = f"{school_id}/{normalized_type}/{attachment_id}{suffix}"
    path = _storage_path(storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)

    attachment = MediaAttachment(
        id=attachment_id,
        school_id=school_id,
        uploaded_by=current_user.id,
        parent_type=normalized_type,
        parent_id=parent_id,
        storage_key=storage_key,
        original_filename=Path(file.filename or "attachment").name,
        mime_type=content_type,
        size_bytes=len(content),
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.get("/", response_model=list[MediaAttachmentOut])
async def list_attachments(
    parent_type: str,
    parent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    normalized_type = parent_type.strip().lower()
    school_id = await _assert_parent_access(normalized_type, parent_id, current_user, db, write=False)
    result = await db.execute(
        select(MediaAttachment)
        .where(
            MediaAttachment.school_id == school_id,
            MediaAttachment.parent_type == normalized_type,
            MediaAttachment.parent_id == parent_id,
            MediaAttachment.deleted_at.is_(None),
        )
        .order_by(MediaAttachment.created_at.asc())
    )
    return result.scalars().all()


@router.get("/{attachment_id}", response_model=MediaAttachmentOut)
async def get_attachment(
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _load_authorized_attachment(attachment_id, current_user, db)


@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attachment = await _load_authorized_attachment(attachment_id, current_user, db)
    path = _storage_path(attachment.storage_key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Attachment file not found.")

    return FileResponse(
        path,
        media_type=attachment.mime_type or "application/octet-stream",
        filename=attachment.original_filename or "attachment",
    )


@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attachment = await _load_authorized_attachment(attachment_id, current_user, db, write=True)
    if attachment.uploaded_by != current_user.id and current_user.role not in {
        UserRole.principal,
        UserRole.secretary,
        UserRole.system_admin,
    }:
        raise HTTPException(status_code=403, detail="Only the uploader or administration can delete this attachment.")

    attachment.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "success"}
