from __future__ import annotations

import argparse
import asyncio
import os
import random
import secrets
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings
from app.core.rls import set_audit_event_write_context, set_request_rls_context
from app.core.security import get_password_hash
from app.db.database import AsyncSessionLocal
from app.models import (
    Announcement,
    Attendance,
    AttendanceStatus,
    AuditEvent,
    Class,
    ClassCourse,
    ClassMember,
    ClassTeacher,
    Conversation,
    ConversationParticipant,
    ConversationType,
    Course,
    DirectMessage,
    Grade,
    Homework,
    LessonEntry,
    MeetingSlot,
    Message,
    Notification,
    Remark,
    RemarkType,
    ScheduleSlot,
    School,
    Semester,
    Student,
    StudentHealthRecord,
    StudentParent,
    TuitionInvoice,
    TuitionInvoiceStatus,
    TuitionPayment,
    User,
    UserRole,
)
from app.modules.auth.routers.auth import TERMS_VERSION
from app.modules.demo.access import DEMO_DOMAIN, DEMO_SCHOOL_NAME
from app.modules.schools.calendar import ALGERIA_TZ, algerian_trimesters


DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "").strip()
# The public demo signs visitors in without a password, so nobody needs to know this one.
_GENERATED_PASSWORD = secrets.token_urlsafe(24)


def demo_password() -> str:
    return DEMO_PASSWORD or _GENERATED_PASSWORD


_PASSWORD_HASH: str | None = None


def demo_password_hash() -> str:
    """Hashed once: bcrypt is slow on purpose, and the nightly rebuild runs inside the API."""
    global _PASSWORD_HASH
    if _PASSWORD_HASH is None:
        _PASSWORD_HASH = get_password_hash(demo_password())
    return _PASSWORD_HASH


@dataclass(frozen=True)
class DemoAccount:
    label: str
    email: str
    password: str
    role: str
    notes: str


# Algerian school week: Sunday to Thursday (Python: Monday is 0, Sunday is 6).
SCHOOL_WEEKDAYS = {6, 0, 1, 2, 3}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def demo_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"


def assert_safe_environment(force: bool) -> None:
    if settings.public_demo_enabled:
        # Explicit opt-in: the demo school is an ordinary, isolated tenant whose
        # accounts are read-only, and no platform administrator is created.
        return
    if settings.is_production:
        raise RuntimeError("Refusing to seed demo data while APP_ENV is production.")
    if not DEMO_PASSWORD:
        raise RuntimeError("DEMO_PASSWORD must be set explicitly for local or staging demo seeding.")

    db_url = settings.database_url.lower()
    local_markers = ("localhost", "127.0.0.1", "@db:", "host.docker.internal")
    if not force and not any(marker in db_url for marker in local_markers):
        raise RuntimeError(
            "Database URL does not look local. Pass --force only if this is an isolated demo/staging database."
        )


async def existing_demo_school(db) -> School | None:
    result = await db.execute(select(School).where(School.name == DEMO_SCHOOL_NAME))
    return result.scalar_one_or_none()


async def reset_demo_school(db, school_id: str) -> None:
    # Newer tables only accept rows of the current school, even for the platform.
    await set_request_rls_context(db, school_id=school_id, is_system_admin=True)
    # Delete child tables explicitly so the reset is deterministic across DBs.
    for table in (
        "student_health_records",
        "report_cards",
        "meeting_slots",
        "announcement_reads",
        "announcement_classes",
        "announcements",
        "schedule_exams",
        "tuition_payments",
        "tuition_invoices",
        "session_cancellations",
        "schedule_slots",
        "direct_messages",
        "conversation_participants",
        "conversations",
        "message_reports",
        "message_blocks",
        "messages",
        "media_attachments",
        "notifications",
        "notification_preferences",
        "refresh_tokens",
        "verification_requests",
        "pending_links",
        "attendance",
        "remarks",
        "grades",
        "lesson_entries",
        "homework",
        "class_temporary_access",
        "class_courses",
        "class_teachers",
        "class_members",
        "student_parents",
        "students",
        "classes",
        "courses",
        "semesters",
        "subscription_payments",
        "audit_events",
    ):
        await db.execute(text(f"DELETE FROM {table} WHERE school_id = :school_id"), {"school_id": school_id})

    await db.execute(text("DELETE FROM users WHERE email LIKE :domain"), {"domain": f"%@{DEMO_DOMAIN}"})
    await db.execute(text("DELETE FROM schools WHERE id = :school_id"), {"school_id": school_id})
    await db.commit()


def add_user(
    db,
    *,
    email: str,
    full_name: str,
    role: UserRole,
    school_id: str | None,
    phone: str | None = None,
) -> User:
    user = User(
        id=str(uuid.uuid4()),
        school_id=school_id,
        email=email,
        full_name=full_name,
        role=role,
        password_hash=demo_password_hash(),
        phone=phone,
        terms_accepted_at=utc_now(),
        terms_version=TERMS_VERSION,
    )
    db.add(user)
    return user


def render_accounts(accounts: list[DemoAccount], *, school_id: str) -> str:
    lines = [
        "# EduConnect Demo Presentation Accounts",
        "",
        "Local demo data only. Do not reuse these credentials in production.",
        "",
        f"- School: {DEMO_SCHOOL_NAME}",
        f"- School ID: {school_id}",
        "- Password: the value configured in the local DEMO_PASSWORD environment variable"
        " (random and unknown when the public demo is enabled).",
        "",
        "| Role | Email | Notes |",
        "| --- | --- | --- |",
    ]
    for account in accounts:
        lines.append(f"| {account.role} | `{account.email}` | {account.notes} |")
    lines.extend(
        [
            "",
            "Suggested presentation flow:",
            "",
            "1. Log in as the principal to show school overview, class setup, analytics, finance, and moderation.",
            "2. Log in as a teacher to show class roster, attendance, grades, homework, and parent messaging.",
            "3. Log in as a parent to show child-only grades, attendance, invoices, notifications, and private messages.",
            "4. Log in as the system admin to show subscription/payment administration.",
            "",
        ]
    )
    return "\n".join(lines)


async def seed_demo_data(*, reset_demo: bool, accounts_output: Path | None, force: bool) -> str:
    assert_safe_environment(force)
    random.seed(20260524)

    async with AsyncSessionLocal() as db:
        await set_request_rls_context(db, is_system_admin=True)
        existing = await existing_demo_school(db)
        if existing and not reset_demo:
            accounts = demo_accounts()
            if accounts_output:
                accounts_output.write_text(render_accounts(accounts, school_id=existing.id), encoding="utf-8")
            return (
                f"Demo school already exists: {existing.id}\n"
                "Use --reset-demo to rebuild it from scratch.\n"
                f"Accounts file: {accounts_output if accounts_output else 'not written'}"
            )
        if existing and reset_demo:
            await reset_demo_school(db, existing.id)
            await set_request_rls_context(db, is_system_admin=True)

        school = School(
            name=DEMO_SCHOOL_NAME,
            student_id_prefix="DEMO",
            prefix_locked=True,
            is_active=True,
            subscription_expires_at=utc_now() + timedelta(days=365),
            tenant_config={
                "active": True,
                "activated_at": utc_now().isoformat(),
                "plan": "presentation",
                "max_parents_per_student": 2,
                "offline_scope": "current_trimester",
                "demo_data": True,
                "seeded_on": datetime.now(ALGERIA_TZ).date().isoformat(),
                # The demo school is already set up; never show it the setup checklist.
                "setup_dismissed": True,
            },
        )
        db.add(school)
        await db.flush()
        await set_request_rls_context(db, school_id=school.id, is_system_admin=True)

        if not settings.public_demo_enabled:
            # A platform administrator must never exist in a publicly reachable demo.
            add_user(
                db,
                email=f"system.admin@{DEMO_DOMAIN}",
                full_name="System Admin Demo",
                role=UserRole.system_admin,
                school_id=None,
                phone="+213555000000",
            )
        principal = add_user(
            db,
            email=f"director@{DEMO_DOMAIN}",
            full_name="Nora Benali",
            role=UserRole.principal,
            school_id=school.id,
            phone="+213555010001",
        )
        secretary = add_user(
            db,
            email=f"secretary@{DEMO_DOMAIN}",
            full_name="Sofia Haddad",
            role=UserRole.secretary,
            school_id=school.id,
            phone="+213555010002",
        )
        teachers = [
            add_user(db, email=f"teacher.math@{DEMO_DOMAIN}", full_name="Amina Rahmani", role=UserRole.teacher, school_id=school.id),
            add_user(db, email=f"teacher.french@{DEMO_DOMAIN}", full_name="Yacine Benali", role=UserRole.teacher, school_id=school.id),
            add_user(db, email=f"teacher.science@{DEMO_DOMAIN}", full_name="Samira Haddad", role=UserRole.teacher, school_id=school.id),
            add_user(db, email=f"teacher.english@{DEMO_DOMAIN}", full_name="Karim Bouchareb", role=UserRole.teacher, school_id=school.id),
        ]
        parents = [
            add_user(db, email=f"parent.nadia@{DEMO_DOMAIN}", full_name="Nadia Meriem", role=UserRole.parent, school_id=school.id),
            add_user(db, email=f"parent.karim@{DEMO_DOMAIN}", full_name="Karim Saadi", role=UserRole.parent, school_id=school.id),
            add_user(db, email=f"parent.salma@{DEMO_DOMAIN}", full_name="Salma Ait Ali", role=UserRole.parent, school_id=school.id),
            add_user(db, email=f"parent.amine@{DEMO_DOMAIN}", full_name="Amine Djerad", role=UserRole.parent, school_id=school.id),
            add_user(db, email=f"parent.leila@{DEMO_DOMAIN}", full_name="Leila Mansouri", role=UserRole.parent, school_id=school.id),
            add_user(db, email=f"parent.rachid@{DEMO_DOMAIN}", full_name="Rachid Khelifi", role=UserRole.parent, school_id=school.id),
        ]
        await db.flush()

        semesters = [
            Semester(school_id=school.id, name=name, start_date=start, end_date=end, is_active=active)
            for name, start, end, active in algerian_trimesters()
        ]
        db.add_all(semesters)

        course_specs = [
            ("Mathematics", "MATH", 4.0),
            ("French", "FR", 3.0),
            ("Arabic", "AR", 3.0),
            ("English", "EN", 2.0),
            ("Science", "SCI", 3.0),
            ("History / Geography", "HG", 2.0),
        ]
        courses = [Course(school_id=school.id, name=name, code=code, coefficient=coef) for name, code, coef in course_specs]
        db.add_all(courses)

        classes = [
            Class(school_id=school.id, name="1AM-A", subject="Middle school", join_code="DEMO1A"),
            Class(school_id=school.id, name="2AM-B", subject="Middle school", join_code="DEMO2B"),
            Class(school_id=school.id, name="3AP-A", subject="Primary school", join_code="DEMO3A"),
        ]
        db.add_all(classes)
        await db.flush()

        for class_index, cls in enumerate(classes):
            lead_teacher = teachers[class_index % len(teachers)]
            assistant_teacher = teachers[(class_index + 1) % len(teachers)]
            db.add(ClassTeacher(school_id=school.id, class_id=cls.id, teacher_id=lead_teacher.id))
            db.add(ClassTeacher(school_id=school.id, class_id=cls.id, teacher_id=assistant_teacher.id))
            for course_index, course in enumerate(courses[:4]):
                db.add(
                    ClassCourse(
                        school_id=school.id,
                        class_id=cls.id,
                        course_id=course.id,
                        teacher_id=teachers[(class_index + course_index) % len(teachers)].id,
                    )
                )

        student_names = [
            "Sami Meriem",
            "Lina Saadi",
            "Yanis Ait Ali",
            "Ines Djerad",
            "Maya Mansouri",
            "Adam Khelifi",
            "Rania Meriem",
            "Ilyes Saadi",
            "Nour Ait Ali",
            "Malek Djerad",
            "Aya Mansouri",
            "Mehdi Khelifi",
        ]
        students: list[Student] = []
        for index, name in enumerate(student_names, start=1):
            student = Student(
                school_id=school.id,
                student_id=f"DEMO-{index:03d}",
                linking_pin=f"{420000 + index}",
                full_name=name,
            )
            students.append(student)
            db.add(student)
        await db.flush()

        parents_of: dict[str, list[User]] = {}
        for index, student in enumerate(students):
            cls = classes[index % len(classes)]
            parent = parents[index % len(parents)]
            db.add(ClassMember(school_id=school.id, class_id=cls.id, student_id=student.id))
            db.add(StudentParent(school_id=school.id, student_id=student.id, parent_id=parent.id))
            parents_of[student.id] = [parent]
            if index in {0, 6}:
                db.add(StudentParent(school_id=school.id, student_id=student.id, parent_id=parents[2].id))
                parents_of[student.id].append(parents[2])

        active_semester = next(item for item in semesters if item.is_active)
        today = utc_now().replace(hour=9, minute=0, second=0, microsecond=0)
        # Up to eight weeks of school life, never before the trimester started.
        history_start = today - timedelta(weeks=8)
        if active_semester.start_date <= today:
            history_start = max(history_start, active_semester.start_date.replace(hour=9))
        school_days = [
            day
            for day in (history_start + timedelta(days=offset) for offset in range((today - history_start).days + 1))
            if day.weekday() in SCHOOL_WEEKDAYS
        ]
        class_teacher = {cls.id: teachers[class_index % len(teachers)] for class_index, cls in enumerate(classes)}

        for index, student in enumerate(students):
            cls = classes[index % len(classes)]
            # One student slips this term so the early-warning panel has someone to show.
            struggling = index == 5
            for course_index, course in enumerate(courses[:4]):
                for exam in range(3):
                    if struggling:
                        score = round(9.5 - exam * 1.5 + (course_index % 2), 1)
                    else:
                        score = round(11.0 + ((index * 2 + course_index * 3 + exam) % 8) + (0.5 if index % 2 else 0), 1)
                    graded_on = today - timedelta(days=4 + (2 - exam) * 14 + course_index)
                    if graded_on < history_start:
                        graded_on = history_start + timedelta(days=exam + course_index)
                    pending = exam == 2 and course_index == 0 and index % 4 == 0
                    db.add(
                        Grade(
                            school_id=school.id,
                            class_id=cls.id,
                            semester_id=active_semester.id,
                            student_id=student.id,
                            student_name=student.full_name,
                            course_id=course.id,
                            subject=course.name,
                            score=score,
                            max_score=20.0,
                            comment="Bonne participation." if score >= 14 else "A consolider avec des exercices courts.",
                            is_approved=not pending,
                            approved_by=None if pending else principal.id,
                            approved_at=None if pending else graded_on + timedelta(days=1),
                            date=graded_on,
                            created_by=teachers[(classes.index(cls) + course_index) % len(teachers)].id,
                        )
                    )

            for day_index, day in enumerate(school_days):
                status = AttendanceStatus.present
                note = None
                if struggling and day_index % 6 == 2:
                    status = AttendanceStatus.absent
                    note = "Absence signalee aux parents."
                elif (index + day_index) % 23 == 0:
                    status = AttendanceStatus.absent
                    note = "Absence signalee aux parents."
                elif (index * 3 + day_index) % 17 == 0:
                    status = AttendanceStatus.late
                    note = "Retard de 10 minutes."
                justified = status == AttendanceStatus.absent and not struggling and index % 2 == 0
                db.add(
                    Attendance(
                        id=f"demo-{student.student_id}-{day:%Y%m%d}",
                        school_id=school.id,
                        class_id=cls.id,
                        semester_id=active_semester.id,
                        student_id=student.id,
                        student_name=student.full_name,
                        status=status,
                        date=day,
                        note=note,
                        is_justified=justified,
                        justification_text="Certificat fourni." if justified else None,
                        recorded_by=class_teacher[cls.id].id,
                    )
                )
                if status == AttendanceStatus.absent:
                    # What parents receive the moment the teacher saves the register.
                    for student_parent in parents_of[student.id]:
                        db.add(
                            Notification(
                                school_id=school.id,
                                user_id=student_parent.id,
                                title="Absence signalee",
                                content=f"{student.full_name} a ete marque(e) absent(e) aujourd'hui.",
                                type="ATTENDANCE",
                                is_read=True,
                                created_at=day.replace(hour=8, minute=20),
                            )
                        )

        lesson_plan = [
            ("Fractions et proportionnalite", "Exercices 4, 5 et 6 page 42. Preparer deux questions pour le prochain cours."),
            ("Pourcentages", "Fiche d'exercices sur les pourcentages, partie A."),
            ("Equations du premier degre", "Exercices 1 a 3 page 58."),
            ("Geometrie : triangles", "Construire les trois triangles de la page 71."),
        ]
        weeks_back = max(1, (today - history_start).days // 7)
        for cls in classes:
            for week in range(weeks_back + 1):
                topic, homework = lesson_plan[week % len(lesson_plan)]
                session_day = today - timedelta(days=1 + 7 * week)
                if session_day < history_start:
                    continue
                db.add(
                    Homework(
                        school_id=school.id,
                        class_id=cls.id,
                        course_id=courses[0].id,
                        subject="Mathematics",
                        lesson_content=topic,
                        homework_content=homework,
                        due_date=session_day + timedelta(days=5),
                        created_at=session_day,
                    )
                )
                db.add(
                    LessonEntry(
                        school_id=school.id,
                        class_id=cls.id,
                        teacher_id=teachers[0].id,
                        course_id=courses[0].id,
                        subject="Mathematics",
                        content=f"{topic} : cours, exercices guides et correction collective.",
                        homework_summary=homework,
                        session_date=session_day,
                        created_at=session_day,
                    )
                )
            db.add(
                Message(
                    school_id=school.id,
                    class_id=cls.id,
                    sender_id=principal.id,
                    sender_name=principal.full_name,
                    content=f"Reunion parents-professeurs pour la classe {cls.name} jeudi a 17h30.",
                    is_announcement=True,
                    recipient_ids=None,
                    created_at=today - timedelta(days=3),
                )
            )

        remarks = [
            (students[0], classes[0], RemarkType.praise, "Excellent esprit d'equipe", "Sami aide regulierement ses camarades."),
            (students[1], classes[1], RemarkType.information, "Progression visible", "Lina rend ses devoirs avec plus de regularite."),
            (students[2], classes[2], RemarkType.warning, "Attention aux retards", "Deux retards cette semaine, suivi demande."),
        ]
        for student, cls, remark_type, title, content in remarks:
            db.add(
                Remark(
                    school_id=school.id,
                    class_id=cls.id,
                    student_id=student.id,
                    student_name=student.full_name,
                    title=title,
                    content=content,
                    type=remark_type,
                    date=today - timedelta(days=1),
                )
            )

        db.add(
            StudentHealthRecord(
                student_id=students[0].id,
                school_id=school.id,
                emergency_contacts=[
                    {"name": "Nadia Meriem", "relationship": "Mere", "phone": "0555 01 02 03"},
                    {"name": "Omar Meriem", "relationship": "Pere", "phone": "0661 04 05 06"},
                ],
                allergies="Arachides (reaction severe).",
                medications="Stylo d'adrenaline dans le cartable.",
                blood_group="O+",
                doctor_name="Dr. Benmoussa",
                doctor_phone="023 45 67 89",
                emergency_instructions="En cas de reaction : stylo d'adrenaline, appeler le 14 (protection civile) puis la mere.",
                teacher_alert="Allergie arachides - stylo d'adrenaline dans le cartable",
                consent_given_at=today - timedelta(days=20),
                consent_by=parents[0].id,
                consent_method="app",
                updated_by=parents[0].id,
            )
        )

        local_today = datetime.now(ALGERIA_TZ).date()
        db.add_all(
            [
                Announcement(
                    school_id=school.id,
                    title="Reunion parents-professeurs",
                    body="Les enseignants recoivent les parents jeudi de 16h a 18h. Reservez un creneau dans l'application.",
                    category="event",
                    starts_on=local_today + timedelta(days=6),
                    ends_on=local_today + timedelta(days=6),
                    whole_school=True,
                    created_by=principal.id,
                    recipient_count=len(parents) + len(teachers),
                    created_at=today - timedelta(days=2),
                ),
                Announcement(
                    school_id=school.id,
                    title="Vacances d'hiver",
                    body="Pas de cours pendant les vacances d'hiver. Reprise selon le calendrier officiel.",
                    category="holiday",
                    starts_on=date(semesters[0].end_date.year, 12, 18),
                    ends_on=date(semesters[0].end_date.year + 1, 1, 4),
                    whole_school=True,
                    created_by=principal.id,
                    recipient_count=len(parents) + len(teachers),
                    created_at=today - timedelta(days=12),
                ),
            ]
        )
        meeting_day = (today + timedelta(days=6)).replace(hour=15, minute=0)
        for slot in range(4):
            starts = meeting_day + timedelta(minutes=15 * slot)
            booked = slot == 0
            db.add(
                MeetingSlot(
                    school_id=school.id,
                    teacher_id=teachers[0].id,
                    class_id=classes[0].id,
                    starts_at=starts,
                    ends_at=starts + timedelta(minutes=15),
                    location="Salle 101",
                    parent_id=parents[0].id if booked else None,
                    student_id=students[0].id if booked else None,
                    note="Parler des progres en calcul mental." if booked else None,
                    booked_at=today - timedelta(days=1) if booked else None,
                )
            )

        for class_index, cls in enumerate(classes):
            for slot_index, course in enumerate(courses[:3]):
                db.add(
                    ScheduleSlot(
                        school_id=school.id,
                        class_id=cls.id,
                        course_id=course.id,
                        course_name=course.name,
                        teacher_id=teachers[(class_index + slot_index) % len(teachers)].id,
                        day_of_week=(slot_index + class_index) % 5,
                        start_time=f"{8 + slot_index:02d}:00",
                        end_time=f"{9 + slot_index:02d}:00",
                        room=f"Salle {101 + class_index * 10 + slot_index}",
                        created_by=principal.id,
                    )
                )

        for index, student in enumerate(students):
            amount_due = 8500.0
            paid = amount_due if index % 3 == 0 else (4000.0 if index % 3 == 1 else 0.0)
            status = TuitionInvoiceStatus.paid if paid == amount_due else (TuitionInvoiceStatus.partial if paid else TuitionInvoiceStatus.unpaid)
            invoice = TuitionInvoice(
                school_id=school.id,
                student_id=student.id,
                label="Frais de scolarite - Trimestre 1",
                amount_due=amount_due,
                amount_paid=paid,
                status=status,
                # Unpaid ones are a couple of weeks late, so the fees screen has follow-ups to show.
                due_date=today - timedelta(days=12) if status == TuitionInvoiceStatus.unpaid else today + timedelta(days=5),
                reminder_count=1 if status == TuitionInvoiceStatus.unpaid else 0,
                last_reminded_at=today - timedelta(days=4) if status == TuitionInvoiceStatus.unpaid else None,
            )
            db.add(invoice)
            await db.flush()
            if paid:
                db.add(
                    TuitionPayment(
                        school_id=school.id,
                        invoice_id=invoice.id,
                        student_id=student.id,
                        amount=paid,
                        payment_method="cash" if index % 2 == 0 else "bank_transfer",
                        receipt_number=f"DEMO-RCPT-{index + 1:04d}",
                        notes="Paiement demo pour presentation.",
                        paid_at=today - timedelta(days=5),
                    )
                )

        direct_conv = Conversation(
            school_id=school.id,
            type=ConversationType.direct,
            title=None,
            created_by=teachers[0].id,
            created_at=today - timedelta(days=2),
        )
        group_conv = Conversation(
            school_id=school.id,
            type=ConversationType.group,
            title="Parents 1AM-A - Informations importantes",
            created_by=teachers[0].id,
            created_at=today - timedelta(days=1),
        )
        db.add_all([direct_conv, group_conv])
        await db.flush()

        db.add_all(
            [
                ConversationParticipant(conversation_id=direct_conv.id, school_id=school.id, user_id=teachers[0].id, last_read_at=today),
                ConversationParticipant(conversation_id=direct_conv.id, school_id=school.id, user_id=parents[0].id, last_read_at=today - timedelta(hours=2)),
                DirectMessage(
                    school_id=school.id,
                    conversation_id=direct_conv.id,
                    sender_id=teachers[0].id,
                    sender_name=teachers[0].full_name,
                    content="Bonjour, Sami a bien progresse en calcul mental cette semaine.",
                    created_at=today - timedelta(days=2, hours=-1),
                ),
                DirectMessage(
                    school_id=school.id,
                    conversation_id=direct_conv.id,
                    sender_id=parents[0].id,
                    sender_name=parents[0].full_name,
                    content="Merci pour votre suivi, nous allons continuer les exercices a la maison.",
                    created_at=today - timedelta(days=1, hours=3),
                ),
            ]
        )
        db.add(ConversationParticipant(conversation_id=group_conv.id, school_id=school.id, user_id=teachers[0].id))
        for parent in parents[:4]:
            db.add(ConversationParticipant(conversation_id=group_conv.id, school_id=school.id, user_id=parent.id))
        db.add(
            DirectMessage(
                school_id=school.id,
                conversation_id=group_conv.id,
                sender_id=teachers[0].id,
                sender_name=teachers[0].full_name,
                content="Controle de mathematiques mardi prochain. Les revisions sont disponibles dans les devoirs.",
                created_at=today - timedelta(hours=5),
            )
        )

        for parent in parents:
            db.add(
                Notification(
                    school_id=school.id,
                    user_id=parent.id,
                    title="Nouvelle information scolaire",
                    content="Consultez les devoirs et le dernier message de l'equipe enseignante.",
                    type="INFO",
                    is_read=False,
                    created_at=today - timedelta(hours=random.randint(1, 20)),
                )
            )
        db.add(
            Notification(
                school_id=school.id,
                user_id=principal.id,
                title="Synthese hebdomadaire disponible",
                content="Les indicateurs de presence et de paiement ont ete mis a jour.",
                type="SUCCESS",
                is_read=False,
            )
        )

        await set_audit_event_write_context(db)
        # Everyday use, so the activity log and the monthly report have something to show.
        for day_index, day in enumerate(school_days):
            for teacher_index, teacher in enumerate(teachers):
                if (day_index + teacher_index) % 5 == 4:
                    continue
                db.add(
                    AuditEvent(
                        school_id=school.id,
                        actor_id=teacher.id,
                        actor_role=teacher.role.value,
                        action="http.post",
                        resource_type="attendance",
                        method="POST",
                        path="/attendance/",
                        status_code=200,
                        device_platform="web",
                        created_at=day.replace(hour=8, minute=5 + teacher_index),
                    )
                )
            for parent_index, parent in enumerate(parents):
                if (day_index + parent_index) % 3:
                    continue
                db.add(
                    AuditEvent(
                        school_id=school.id,
                        actor_id=parent.id,
                        actor_role=parent.role.value,
                        action="http.get",
                        resource_type="grades",
                        method="GET",
                        path="/grades/",
                        status_code=200,
                        device_platform="android" if parent_index % 2 else "ios",
                        created_at=day.replace(hour=18, minute=10 + parent_index),
                    )
                )
        db.add_all(
            [
                AuditEvent(
                    school_id=school.id,
                    actor_id=principal.id,
                    actor_role=principal.role.value,
                    action="demo.school_seeded",
                    resource_type="school",
                    resource_id=school.id,
                    method="SCRIPT",
                    path="scripts/seed_demo_presentation_data.py",
                    status_code=201,
                    ip_address="127.0.0.1",
                    device_platform="local-script",
                    event_metadata={"purpose": "school presentation"},
                ),
                AuditEvent(
                    school_id=school.id,
                    actor_id=teachers[0].id,
                    actor_role=teachers[0].role.value,
                    action="grades.approved",
                    resource_type="class",
                    resource_id=classes[0].id,
                    method="SCRIPT",
                    path="demo/grades",
                    status_code=200,
                    ip_address="127.0.0.1",
                    device_platform="local-script",
                    event_metadata={"approved_count": len(students) * 4},
                ),
            ]
        )

        await db.commit()

        accounts = demo_accounts()
        if accounts_output:
            accounts_output.parent.mkdir(parents=True, exist_ok=True)
            accounts_output.write_text(render_accounts(accounts, school_id=school.id), encoding="utf-8")

        return "\n".join(
            [
                "EduConnect demo presentation data seeded.",
                f"School: {DEMO_SCHOOL_NAME}",
                f"School ID: {school.id}",
                f"Users: {2 + len(teachers) + len(parents) + (0 if settings.public_demo_enabled else 1)}",
                f"Students: {len(students)}",
                f"Classes: {len(classes)}",
                f"Accounts file: {accounts_output if accounts_output else 'not written'}",
            ]
        )


def demo_accounts() -> list[DemoAccount]:
    platform = (
        []
        if settings.public_demo_enabled
        else [DemoAccount("system", f"system.admin@{DEMO_DOMAIN}", demo_password(), "system_admin", "Platform / subscription administration.")]
    )
    return platform + [
        DemoAccount("principal", f"director@{DEMO_DOMAIN}", demo_password(), "principal", "School leadership dashboard."),
        DemoAccount("secretary", f"secretary@{DEMO_DOMAIN}", demo_password(), "secretary", "Administrative workflows."),
        DemoAccount("teacher_math", f"teacher.math@{DEMO_DOMAIN}", demo_password(), "teacher", "Grades, attendance, homework, class messaging."),
        DemoAccount("teacher_french", f"teacher.french@{DEMO_DOMAIN}", demo_password(), "teacher", "Second teacher profile."),
        DemoAccount("teacher_science", f"teacher.science@{DEMO_DOMAIN}", demo_password(), "teacher", "Science teacher assigned to demo classes."),
        DemoAccount("teacher_english", f"teacher.english@{DEMO_DOMAIN}", demo_password(), "teacher", "English teacher assigned to demo classes."),
        DemoAccount("parent_nadia", f"parent.nadia@{DEMO_DOMAIN}", demo_password(), "parent", "Parent with linked child and private messages."),
        DemoAccount("parent_karim", f"parent.karim@{DEMO_DOMAIN}", demo_password(), "parent", "Parent view with invoices and attendance."),
        DemoAccount("parent_salma", f"parent.salma@{DEMO_DOMAIN}", demo_password(), "parent", "Parent linked to an additional demo student."),
        DemoAccount("parent_amine", f"parent.amine@{DEMO_DOMAIN}", demo_password(), "parent", "Parent linked to an additional demo student."),
        DemoAccount("parent_leila", f"parent.leila@{DEMO_DOMAIN}", demo_password(), "parent", "Parent linked to an additional demo student."),
        DemoAccount("parent_rachid", f"parent.rachid@{DEMO_DOMAIN}", demo_password(), "parent", "Parent linked to an additional demo student."),
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed local EduConnect demo data for school presentations.")
    parser.add_argument("--reset-demo", action="store_true", help="Delete and recreate the existing demo school.")
    parser.add_argument("--force", action="store_true", help="Allow seeding a non-local isolated demo database.")
    parser.add_argument(
        "--accounts-output",
        default=str(PROJECT_ROOT / "DEMO_PRESENTATION_ACCOUNTS.md"),
        help="Where to write the local demo login cheat sheet. Use empty string to disable.",
    )
    return parser.parse_args()


async def async_main() -> int:
    args = parse_args()
    output = Path(args.accounts_output).resolve() if args.accounts_output else None
    try:
        report = await seed_demo_data(reset_demo=args.reset_demo, accounts_output=output, force=args.force)
    except Exception as exc:
        print(f"FAIL: {exc}")
        return 1
    print(report)
    return 0


def main() -> int:
    return asyncio.run(async_main())


if __name__ == "__main__":
    raise SystemExit(main())
