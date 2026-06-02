from __future__ import annotations

import argparse
import asyncio
import random
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
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
    Message,
    Notification,
    Remark,
    RemarkType,
    ScheduleSlot,
    School,
    Semester,
    Student,
    StudentParent,
    TuitionInvoice,
    TuitionInvoiceStatus,
    TuitionPayment,
    User,
    UserRole,
)


DEMO_SCHOOL_NAME = "EduConnect Demo Academy"
DEMO_DOMAIN = "demo.educonnect.dz"
DEMO_PASSWORD = "Demo2026!"
TERMS_VERSION = "demo-privacy-terms-2026-05-24"


@dataclass(frozen=True)
class DemoAccount:
    label: str
    email: str
    password: str
    role: str
    notes: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def demo_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"


def assert_safe_environment(force: bool) -> None:
    if settings.is_production and not force:
        raise RuntimeError("Refusing to seed demo data while APP_ENV is production. Pass --force only for an isolated demo database.")

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
    await set_request_rls_context(db, is_system_admin=True)
    # Delete child tables explicitly so the reset is deterministic across DBs.
    for table in (
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
        password_hash=get_password_hash(DEMO_PASSWORD),
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
        f"- Password for all accounts: `{DEMO_PASSWORD}`",
        "",
        "| Role | Email | Password | Notes |",
        "| --- | --- | --- | --- |",
    ]
    for account in accounts:
        lines.append(f"| {account.role} | `{account.email}` | `{account.password}` | {account.notes} |")
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
            },
        )
        db.add(school)
        await db.flush()
        await set_request_rls_context(db, school_id=school.id, is_system_admin=True)

        system_admin = add_user(
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

        current_year = utc_now().year
        semesters = [
            Semester(
                school_id=school.id,
                name="Trimester 1",
                start_date=datetime(current_year, 9, 15, tzinfo=timezone.utc),
                end_date=datetime(current_year, 12, 15, tzinfo=timezone.utc),
                is_active=True,
            ),
            Semester(
                school_id=school.id,
                name="Trimester 2",
                start_date=datetime(current_year + 1, 1, 5, tzinfo=timezone.utc),
                end_date=datetime(current_year + 1, 3, 25, tzinfo=timezone.utc),
                is_active=False,
            ),
            Semester(
                school_id=school.id,
                name="Trimester 3",
                start_date=datetime(current_year + 1, 4, 5, tzinfo=timezone.utc),
                end_date=datetime(current_year + 1, 7, 5, tzinfo=timezone.utc),
                is_active=False,
            ),
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

        for index, student in enumerate(students):
            cls = classes[index % len(classes)]
            parent = parents[index % len(parents)]
            db.add(ClassMember(school_id=school.id, class_id=cls.id, student_id=student.id))
            db.add(StudentParent(school_id=school.id, student_id=student.id, parent_id=parent.id))
            if index in {0, 6}:
                db.add(StudentParent(school_id=school.id, student_id=student.id, parent_id=parents[2].id))

        active_semester = semesters[0]
        today = utc_now().replace(hour=9, minute=0, second=0, microsecond=0)
        for index, student in enumerate(students):
            cls = classes[index % len(classes)]
            for course_index, course in enumerate(courses[:4]):
                score = round(11.0 + ((index * 2 + course_index * 3) % 8) + (0.5 if index % 2 else 0), 1)
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
                        is_approved=True,
                        approved_by=principal.id,
                        approved_at=today - timedelta(days=2),
                        date=today - timedelta(days=course_index + 2),
                    )
                )

            for day_offset in range(7):
                status = AttendanceStatus.present
                note = None
                if (index + day_offset) % 11 == 0:
                    status = AttendanceStatus.absent
                    note = "Absence signalee aux parents."
                elif (index + day_offset) % 7 == 0:
                    status = AttendanceStatus.late
                    note = "Retard de 10 minutes."
                date = today - timedelta(days=day_offset)
                db.add(
                    Attendance(
                        id=f"demo-{student.student_id}-{date:%Y%m%d}",
                        school_id=school.id,
                        class_id=cls.id,
                        semester_id=active_semester.id,
                        student_id=student.id,
                        student_name=student.full_name,
                        status=status,
                        date=date,
                        note=note,
                        is_justified=status == AttendanceStatus.absent and index % 2 == 0,
                        justification_text="Certificat fourni." if status == AttendanceStatus.absent and index % 2 == 0 else None,
                    )
                )

        for cls in classes:
            db.add(
                Homework(
                    school_id=school.id,
                    class_id=cls.id,
                    course_id=courses[0].id,
                    subject="Mathematics",
                    lesson_content="Fractions et proportionnalite",
                    homework_content="Exercices 4, 5 et 6 page 42. Preparer deux questions pour le prochain cours.",
                    due_date=today + timedelta(days=4),
                )
            )
            db.add(
                LessonEntry(
                    school_id=school.id,
                    class_id=cls.id,
                    teacher_id=teachers[0].id,
                    course_id=courses[0].id,
                    subject="Mathematics",
                    content="Correction du controle court, puis introduction aux pourcentages.",
                    homework_summary="Revoir les exercices sur fractions.",
                    session_date=today - timedelta(days=1),
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
                due_date=today + timedelta(days=10),
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
                f"Users: {2 + len(teachers) + len(parents) + 1}",
                f"Students: {len(students)}",
                f"Classes: {len(classes)}",
                f"Accounts file: {accounts_output if accounts_output else 'not written'}",
            ]
        )


def demo_accounts() -> list[DemoAccount]:
    return [
        DemoAccount("system", f"system.admin@{DEMO_DOMAIN}", DEMO_PASSWORD, "system_admin", "Platform / subscription administration."),
        DemoAccount("principal", f"director@{DEMO_DOMAIN}", DEMO_PASSWORD, "principal", "School leadership dashboard."),
        DemoAccount("secretary", f"secretary@{DEMO_DOMAIN}", DEMO_PASSWORD, "secretary", "Administrative workflows."),
        DemoAccount("teacher_math", f"teacher.math@{DEMO_DOMAIN}", DEMO_PASSWORD, "teacher", "Grades, attendance, homework, class messaging."),
        DemoAccount("teacher_french", f"teacher.french@{DEMO_DOMAIN}", DEMO_PASSWORD, "teacher", "Second teacher profile."),
        DemoAccount("teacher_science", f"teacher.science@{DEMO_DOMAIN}", DEMO_PASSWORD, "teacher", "Science teacher assigned to demo classes."),
        DemoAccount("teacher_english", f"teacher.english@{DEMO_DOMAIN}", DEMO_PASSWORD, "teacher", "English teacher assigned to demo classes."),
        DemoAccount("parent_nadia", f"parent.nadia@{DEMO_DOMAIN}", DEMO_PASSWORD, "parent", "Parent with linked child and private messages."),
        DemoAccount("parent_karim", f"parent.karim@{DEMO_DOMAIN}", DEMO_PASSWORD, "parent", "Parent view with invoices and attendance."),
        DemoAccount("parent_salma", f"parent.salma@{DEMO_DOMAIN}", DEMO_PASSWORD, "parent", "Parent linked to an additional demo student."),
        DemoAccount("parent_amine", f"parent.amine@{DEMO_DOMAIN}", DEMO_PASSWORD, "parent", "Parent linked to an additional demo student."),
        DemoAccount("parent_leila", f"parent.leila@{DEMO_DOMAIN}", DEMO_PASSWORD, "parent", "Parent linked to an additional demo student."),
        DemoAccount("parent_rachid", f"parent.rachid@{DEMO_DOMAIN}", DEMO_PASSWORD, "parent", "Parent linked to an additional demo student."),
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
