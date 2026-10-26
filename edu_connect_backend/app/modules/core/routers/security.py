import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import purge_expired_audit_events, record_audit_event
from app.core.security import get_current_user
from app.db.database import get_db
from app.modules.demo.access import is_read_only_demo_user
from app.models import Attendance, Class, ClassMember, Grade, Remark, Student, StudentParent, AuditEvent, User, UserRole

router = APIRouter(prefix="/security", tags=["Security"])


def _dt(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _value(value):
    return value.value if hasattr(value, "value") else value


class AuditEventOut(BaseModel):
    id: str
    school_id: str | None = None
    actor_id: str | None = None
    actor_role: str | None = None
    action: str
    resource_type: str | None = None
    resource_id: str | None = None
    method: str | None = None
    path: str | None = None
    status_code: int | None = None
    ip_address: str | None = None
    device_fingerprint: str | None = None
    device_platform: str | None = None
    user_agent: str | None = None
    event_metadata: dict | None = None
    created_at: datetime
    actor_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AuditRetentionPurgeOut(BaseModel):
    deleted_count: int
    cutoff: datetime


def _audit_query(
    current_user: User,
    *,
    actor_id: str | None,
    action: str | None,
    category: str | None,
    include_http: bool,
    resource_type: str | None,
    resource_id: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
):
    """Filtered audit events (with the actor's name), scoped to the admin's school."""
    if current_user.role not in {UserRole.system_admin, UserRole.principal, UserRole.secretary}:
        raise HTTPException(status_code=403, detail="Only administrators can view audit events.")

    stmt = select(AuditEvent, User.full_name).outerjoin(User, User.id == AuditEvent.actor_id)
    if current_user.role != UserRole.system_admin:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="User is not assigned to a school.")
        stmt = stmt.where(AuditEvent.school_id == current_user.school_id)

    if actor_id:
        stmt = stmt.where(AuditEvent.actor_id == actor_id)
    if action:
        stmt = stmt.where(AuditEvent.action == action)
    if category:
        # "auth" matches auth.login_success, auth.logout, ...
        stmt = stmt.where(AuditEvent.action.like(f"{category.strip('.')}.%"))
    if not include_http:
        stmt = stmt.where(AuditEvent.action.not_like("http.%"))
    if resource_type:
        stmt = stmt.where(AuditEvent.resource_type == resource_type)
    if resource_id:
        stmt = stmt.where(AuditEvent.resource_id == resource_id)
    if date_from:
        stmt = stmt.where(AuditEvent.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditEvent.created_at <= date_to)
    return stmt.order_by(AuditEvent.created_at.desc())


def _with_name(event: AuditEvent, actor_name: str | None, *, hide_device: bool = False) -> AuditEventOut:
    out = AuditEventOut.model_validate(event)
    out.actor_name = actor_name
    if hide_device:
        # Public demo: these would be other visitors' addresses and browsers.
        out.ip_address = out.user_agent = out.device_fingerprint = None
    return out


@router.get("/audit-events", response_model=list[AuditEventOut])
async def list_audit_events(
    actor_id: str | None = None,
    action: str | None = None,
    category: str | None = Query(None, max_length=40, pattern=r"^[a-z_]+\.?$"),
    include_http: bool = True,
    resource_type: str | None = None,
    resource_id: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0, le=100_000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = _audit_query(
        current_user,
        actor_id=actor_id,
        action=action,
        category=category,
        include_http=include_http,
        resource_type=resource_type,
        resource_id=resource_id,
        date_from=date_from,
        date_to=date_to,
    )
    rows = (await db.execute(stmt.offset(offset).limit(limit))).all()
    hide_device = is_read_only_demo_user(current_user)
    return [_with_name(event, name, hide_device=hide_device) for event, name in rows]


EXPORT_MAX_ROWS = 5000


@router.get("/audit-events/export")
async def export_audit_events(
    request: Request,
    actor_id: str | None = None,
    action: str | None = None,
    category: str | None = Query(None, max_length=40, pattern=r"^[a-z_]+\.?$"),
    include_http: bool = True,
    resource_type: str | None = None,
    resource_id: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """CSV of the filtered audit log (newest first, at most 5000 rows). The export is itself audited."""
    stmt = _audit_query(
        current_user,
        actor_id=actor_id,
        action=action,
        category=category,
        include_http=include_http,
        resource_type=resource_type,
        resource_id=resource_id,
        date_from=date_from,
        date_to=date_to,
    )
    rows = (await db.execute(stmt.limit(EXPORT_MAX_ROWS))).all()
    hide_device = is_read_only_demo_user(current_user)

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["date_utc", "person", "role", "action", "resource", "resource_id", "status", "ip", "device", "details"])
    for event, name in rows:
        writer.writerow([
            _dt(event.created_at),
            name or "",
            event.actor_role or "",
            event.action,
            event.resource_type or "",
            event.resource_id or "",
            event.status_code or "",
            "" if hide_device else event.ip_address or "",
            event.device_platform or "",
            "; ".join(f"{key}={value}" for key, value in (event.event_metadata or {}).items()),
        ])

    await record_audit_event(
        db,
        action="audit.exported",
        actor=current_user,
        school_id=current_user.school_id,
        resource_type="audit",
        method=request.method,
        path=request.url.path,
        metadata={"rows": len(rows), "category": category, "actor_id": actor_id},
    )
    await db.commit()
    filename = f"journal_audit_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/audit-events/retention/purge", response_model=AuditRetentionPurgeOut)
async def purge_audit_retention(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="Only system administrators can purge retained audit events.")

    deleted_count, cutoff = await purge_expired_audit_events(db)
    await db.commit()
    return AuditRetentionPurgeOut(deleted_count=deleted_count, cutoff=cutoff)


@router.get("/students/{student_id}/export")
async def export_student_record(
    student_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    is_parent = current_user.role == UserRole.parent
    is_school_admin = current_user.role in {UserRole.principal, UserRole.secretary}
    if current_user.role == UserRole.system_admin:
        pass
    elif is_school_admin:
        if student.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif is_parent:
        if student.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Access denied.")
        link_res = await db.execute(
            select(StudentParent).where(
                StudentParent.school_id == student.school_id,
                StudentParent.student_id == student_id,
                StudentParent.parent_id == current_user.id,
            )
        )
        if not link_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied.")
    else:
        raise HTTPException(status_code=403, detail="Only parents and administrators can export a student record.")

    classes_res = await db.execute(
        select(Class)
        .join(ClassMember, ClassMember.class_id == Class.id)
        .where(
            Class.school_id == student.school_id,
            ClassMember.school_id == student.school_id,
            ClassMember.student_id == student_id,
        )
        .order_by(Class.name.asc())
    )
    grade_stmt = select(Grade).where(Grade.student_id == student_id, Grade.school_id == student.school_id)
    if is_parent:
        grade_stmt = grade_stmt.where(Grade.is_approved == True)
    grades_res = await db.execute(grade_stmt.order_by(Grade.date.desc()))
    attendance_res = await db.execute(
        select(Attendance)
        .where(Attendance.student_id == student_id, Attendance.school_id == student.school_id)
        .order_by(Attendance.date.desc())
    )
    remarks_res = await db.execute(
        select(Remark)
        .where(Remark.student_id == student_id, Remark.school_id == student.school_id)
        .order_by(Remark.date.desc())
    )

    classes = classes_res.scalars().all()
    grades = grades_res.scalars().all()
    attendance_records = attendance_res.scalars().all()
    remarks = remarks_res.scalars().all()

    await record_audit_event(
        db,
        action="data_export.student",
        actor=current_user,
        school_id=student.school_id,
        resource_type="student",
        resource_id=student.id,
        method=request.method,
        path=request.url.path,
        status_code=200,
        ip_address=getattr(request.state, "ip_address", None),
        device_fingerprint=getattr(request.state, "device_fingerprint", None),
        device_platform=getattr(request.state, "device_platform", None),
        user_agent=request.headers.get("user-agent"),
        metadata={
            "student_id": student.student_id,
            "requester_role": current_user.role.value,
            "class_count": len(classes),
            "grade_count": len(grades),
            "attendance_count": len(attendance_records),
            "remark_count": len(remarks),
            "format_version": "student-export-2026-05",
        },
    )
    await db.commit()

    return {
        "format_version": "student-export-2026-05",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "student": {
            "id": student.id,
            "school_id": student.school_id,
            "student_id": student.student_id,
            "full_name": student.full_name,
            "created_at": _dt(student.created_at),
            "archived_at": _dt(student.archived_at),
            "archive_reason": student.archive_reason,
        },
        "classes": [
            {
                "id": cls.id,
                "name": cls.name,
                "subject": cls.subject,
                "created_at": _dt(cls.created_at),
            }
            for cls in classes
        ],
        "grades": [
            {
                "id": grade.id,
                "class_id": grade.class_id,
                "course_id": grade.course_id,
                "subject": grade.subject,
                "score": grade.score,
                "max_score": grade.max_score,
                "comment": grade.comment,
                "is_approved": grade.is_approved,
                "approved_at": _dt(grade.approved_at),
                "date": _dt(grade.date),
            }
            for grade in grades
        ],
        "attendance": [
            {
                "id": attendance.id,
                "class_id": attendance.class_id,
                "status": _value(attendance.status),
                "date": _dt(attendance.date),
                "note": attendance.note,
                "is_justified": attendance.is_justified,
                "justification_text": attendance.justification_text,
            }
            for attendance in attendance_records
        ],
        "remarks": [
            {
                "id": remark.id,
                "class_id": remark.class_id,
                "title": remark.title,
                "content": remark.content,
                "type": _value(remark.type),
                "date": _dt(remark.date),
            }
            for remark in remarks
        ],
    }
