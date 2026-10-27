# Data model

43 tables in PostgreSQL. Tables marked **RLS** have a `school_id` and row-level
security enabled and forced (one school can never read another's rows). Defined
as SQLAlchemy models in `edu_connect_backend/app/modules/*/models.py` and created
by the numbered migrations in `alembic/versions/`.

## Schools and people

| Table | Holds |
| --- | --- |
| `schools` | One row per school: name, student-ID prefix, active flag, `subscription_expires_at`, `logo_data`, `referral_code`, `referred_by`, and `tenant_config` (JSON: `max_parents_per_student`, `plan`, `fee_auto_reminders`, `mentions`, `setup_dismissed`, `monthly_report_notified`, `referral_rewarded_at`, `demo_data`…). Not RLS (global). |
| `subscription_payments` — **RLS** | Payments of the school's subscription recorded by the platform administrator. |
| `semesters` — **RLS** | The three trimesters of the school year (dates, which is active). |
| `users` — **RLS** (with sign-in lookup exceptions) | Staff and parents: email, role, password hash, `token_version`, `deactivated_at`, invite code and expiry, terms version, push topic. |
| `students` — **RLS** | A student: name, human ID (e.g. `EDU26-001`), 6-digit linking PIN, archive data. |
| `student_parents` — **RLS** | Which parents are linked to which student. |
| `pending_links`, `verification_requests` — **RLS** | QR tokens and requests used to link a parent to a student. |
| `refresh_tokens` — **RLS** | Refresh-token hashes, session family, device info, expiry. |
| `push_devices` — **RLS** | Firebase tokens of a user's phones. |

## Classes and teaching

| Table | Holds |
| --- | --- |
| `classes`, `courses` — **RLS** | Classes (name, join code) and subjects (name, default coefficient). |
| `class_members` — **RLS** | Which students are in which class. |
| `class_teachers`, `class_courses` — **RLS** | Teachers of a class, and which teacher teaches which subject there (with the subject's coefficient for that class). |
| `class_temporary_access` — **RLS** | Time-limited read access for a substitute teacher. |
| `grades` — **RLS** | Score, max score, subject/course, semester, approval state and approver, `created_by`. |
| `attendance` — **RLS** | Status (present/absent/late), justification and its acceptance, `recorded_by`. |
| `remarks` — **RLS** | Praise / information / warning notes. |
| `homework`, `lesson_entries` — **RLS** | Homework and exams; the lesson diary. |
| `schedule_slots`, `session_cancellations`, `schedule_exams` — **RLS** | Weekly timetable, cancelled sessions, planned exams. |

## Official documents, fees and health

| Table | Holds |
| --- | --- |
| `report_cards` — **RLS** (plus a read-only lookup policy by `verify_code`) | Published snapshot per student, class and trimester (JSON), average, rank, `verify_code` for the QR check. |
| `tuition_invoices` — **RLS** | A fee owed by a student: label, `amount_due`/`amount_paid` (`NUMERIC(12,2)`), status, due date, reminder count and date. |
| `tuition_payments` — **RLS** | Payments with method, receipt number (unique), notes. |
| `student_health_records` — **RLS** | The health and emergency sheet; every health field is stored encrypted; consent time, who and how (app or paper). |

## Communication

| Table | Holds |
| --- | --- |
| `messages` — **RLS** | Class chat and class announcements (with recipient list). |
| `conversations`, `conversation_participants`, `direct_messages` — **RLS** | Direct and group conversations. |
| `message_blocks`, `message_reports` — **RLS** | Blocking and abuse reports. |
| `announcements`, `announcement_classes`, `announcement_reads` — **RLS** | School/class announcements, calendar events, read receipts. |
| `meeting_slots` — **RLS** | Parent–teacher meeting slots and their bookings. |
| `notifications`, `notification_preferences` — **RLS** | In-app notifications and per-type preferences. |
| `media_attachments` — **RLS** | Private uploaded files (scanned for malware). |

## Security and operations

| Table | Holds |
| --- | --- |
| `audit_events` — **RLS** (system events may have no school) | Who did what and when: actor, role, action, resource, status, IP, device, metadata. Retention follows `AUDIT_RETENTION_DAYS`. |
| `migration_orphans` — **RLS** | Rows set aside by the tenant migration for review. |

## Conventions

- Primary keys are UUID strings (`VARCHAR(36)`); user IDs allow 128 characters.
- Timestamps are timezone-aware UTC; day boundaries for school logic are computed in Algeria time (`UTC+1`).
- Deleting a school cascades to everything it owns. Deleting a student is restricted to the retention job; students are normally **archived**.
- Personal data of a parent who deletes their account is anonymised and links removed; academic history is kept.
- Money is `NUMERIC(12,2)`; never use floating point for amounts.

## Migration history

Run with `alembic upgrade head`. Revisions are idempotent where the baseline
(`0001`) could already have created the object, so a new database and an upgraded
one end at the same schema.

| # | Date | Change |
| --- | --- | --- |
| 0001 | 2026-05-06 | Baseline schema (created from the models) with tenant RLS |
| 0002 | 2026-05-13 | Terms acceptance on users |
| 0003 | 2026-05-19 | Message privacy (recipient lists) |
| 0004 | 2026-05-19 | Audit events, sessions, media attachments |
| 0005–0006 | 2026-05-19 | Force RLS; harden sign-in lookups and audit writes |
| 0007 | 2026-05-19 | Message abuse controls (blocks, reports) |
| 0008 | 2026-05-20 | Student retention and archiving |
| 0009 | 2026-06-02 | Per-class subject coefficients |
| 0010–0011 | 2026-06-03 | Homework kinds; exam planning |
| 0012 | 2026-08-07 | Harden staff invitations |
| 0013 | 2026-10-12 | Account lifecycle: deactivation and token versions |
| 0014 | 2026-10-12 | Homework author |
| 0015 | 2026-10-12 | Announcements and calendar |
| 0016 | 2026-10-13 | Report cards |
| 0017 | 2026-10-13 | Parent–teacher meeting slots |
| 0018 | 2026-10-21 | Health records; who entered grades and attendance |
| 0019 | 2026-10-24 | Fee reminders |
| 0020 | 2026-10-24 | Exact money (`NUMERIC`) |
| 0021 | 2026-10-24 | School logo |
| 0022 | 2026-10-24 | Health fields stored encrypted |
| 0023 | 2026-10-24 | Nurse role |
| 0024 | 2026-10-24 | Report card verification codes |
| 0025 | 2026-10-24 | Referral codes |
| 0026 | 2026-10-27 | Push devices |

Adding a migration: see [Development](DEVELOPMENT.md#database-migrations).
