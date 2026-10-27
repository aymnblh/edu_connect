# API reference

_182 endpoints, generated from the code by `edu_connect_backend/scripts/generate_api_docs.py`._

Every endpoint except the public ones needs `Authorization: Bearer <access token>`. Parameters marked `*` are required; path parameters appear in the URL. Who may call an endpoint is enforced by the server (see [Security and privacy](SECURITY.md)); the interactive explorer (`/docs`) is disabled in production.

Public endpoints (no account): `/health*`, `/auth/login`, `/auth/refresh`, `/auth/verify-code`, `/auth/register-parent-code`, `/auth/complete-*-code`, `/auth/demo*`, `/onboarding/register-school`, `/public/report-cards/{code}`.

## Admin Tools

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/admin/analytics/insights` | Early warning for the director: students at risk, attendance trend, pending work. | semester_id |
| GET | `/admin/analytics/overview` | SaaS Dashboard Analytics: - Global school average - Class-by-class averages - Parent adoption rate | — |
| GET | `/admin/attendance/pending` | Pending Attendance | — |
| GET | `/admin/courses` | List Courses | — |
| POST | `/admin/courses` | Create Course | — |
| POST | `/admin/create-staff` | Invite a teacher or secretary account with a first-login code. | — |
| POST | `/admin/create-teacher` | Principal creates a teacher account without a password. An invite_code is generated so the teacher can log in for the first time. | — |
| POST | `/admin/import/students` | Import students from a CSV file. Expected columns: full_name, or prenom + nom; optional classe to enrol each student in an existing class of that name. | — |
| POST | `/admin/import/teachers` | Invite teachers from a CSV file: full_name (or prenom + nom) and email. Each new teacher gets a first-login code, valid 72 hours, returned once so the school can hand it out. Existing emails and invalid rows are reported, not imported. | — |
| POST | `/admin/parents/{parent_id}/reset-access` | Issue a new access code for a parent who lost their password. | parent_id* |
| POST | `/admin/schools` | Create a school only from the authenticated platform administration workspace. | — |
| GET | `/admin/semesters` | List Semesters | — |
| PUT | `/admin/semesters/{semester_id}` | Update Semester | semester_id* |
| GET | `/admin/staff` | List Staff | — |
| POST | `/admin/staff/{user_id}/deactivate` | Block a teacher or secretary who left the school. | user_id* |
| POST | `/admin/staff/{user_id}/reset-access` | Issue a new first-login code for a teacher or secretary. | user_id* |
| GET | `/admin/students` | Admin: list all students in the school. | include_archived |
| POST | `/admin/students/{student_id}/archive` | Archive a student for graduation/transfer without deleting academic records. | student_id* |
| POST | `/admin/students/{student_id}/generate-link-tokens` | Generate distinct one-time QR tokens for multiple parents (e.g., Mère, Père). | student_id* |
| GET | `/admin/students/{student_id}/links` | List all parent links (active, used, or revoked) for a student. | student_id* |
| GET | `/admin/students/{student_id}/parents` | List all parents linked to a student. | student_id* |
| DELETE | `/admin/students/{student_id}/parents/{parent_id}` | Remove a parent/student relationship and force that parent to sign in again. | student_id*, parent_id* |
| POST | `/admin/students/{student_id}/regenerate-pin` | Regenerate Pin | student_id* |
| POST | `/admin/students/{student_id}/restore` | Restore an archived student when an archive was applied in error. | student_id* |
| POST | `/admin/students/{student_id}/revoke-link/{link_id}` | Revoke a parent's access. 1. Mark link as revoked. 2. Remove from StudentParent relationship. 3. FORCE LOGOUT: Invalidate all active refresh tokens for that user. | student_id*, link_id* |
| POST | `/admin/users/{user_id}/sign-out` | End every session of a staff member or parent (their password still works). | user_id* |

## Announcements

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/announcements/` | List Announcements | calendar_only, limit |
| POST | `/announcements/` | Create Announcement | — |
| DELETE | `/announcements/{announcement_id}` | Delete Announcement | announcement_id* |
| POST | `/announcements/{announcement_id}/read` | Mark Announcement Read | announcement_id* |

## Attendance

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/classes/{class_id}/attendance/` | List Attendance | class_id* |
| POST | `/classes/{class_id}/attendance/` | Mark Attendance | class_id* |
| GET | `/classes/{class_id}/attendance/student/{student_id}` | Student Attendance | class_id*, student_id* |
| PATCH | `/classes/{class_id}/attendance/{attendance_id}` | Correct an attendance record, including past days. | class_id*, attendance_id* |
| PATCH | `/classes/{class_id}/attendance/{attendance_id}/justify` | Justify Absence | class_id*, attendance_id* |

## Authentication

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| POST | `/auth/change-password` | Change the signed-in user's password and sign out every other session. | — |
| POST | `/auth/complete-staff-code` | Complete Staff Code | — |
| POST | `/auth/complete-teacher-code` | Complete Teacher Code | — |
| GET | `/auth/demo` | Lets the login page know whether to offer the public demo. | — |
| POST | `/auth/demo-login` | Open a read-only session on the demo school, without an account. | — |
| POST | `/auth/login` | Login | — |
| POST | `/auth/logout` | Invalidate a specific refresh token. | — |
| POST | `/auth/refresh` | Strict rotation: invalidate old, issue new. | — |
| POST | `/auth/register-parent-code` | Register Parent Code | — |
| GET | `/auth/sessions` | List Sessions | — |
| POST | `/auth/sessions/revoke-others` | Sign out every other device; this device continues with new tokens. | — |
| DELETE | `/auth/sessions/{family_id}` | Revoke Session | family_id* |
| POST | `/auth/set-password` | Initial password setup for migrated or invited users. | — |
| POST | `/auth/verify-code` | Verify Code | — |

## Chat

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/classes/{class_id}/messages` | Get Messages | class_id* |

## Classes

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/classes/` | List Classes | — |
| POST | `/classes/` | Create Class | — |
| GET | `/classes/teachers/all` | Admin: list all teachers in the school. | — |
| GET | `/classes/{class_id}` | Get Class | class_id* |
| GET | `/classes/{class_id}/courses` | List all courses assigned to a class with their responsible teacher. | class_id* |
| POST | `/classes/{class_id}/courses` | Admin assigns a course (matière) with its responsible teacher to a class. | class_id* |
| DELETE | `/classes/{class_id}/courses/{course_id}` | Admin removes a course assignment from a class. | class_id*, course_id* |
| GET | `/classes/{class_id}/students` | List Class Students | class_id* |
| PUT | `/classes/{class_id}/students` | Admin sets the list of enrolled students (replaces existing enrollment). | class_id* |
| GET | `/classes/{class_id}/temporary-access` | List Temporary Access | class_id* |
| POST | `/classes/{class_id}/temporary-access` | Grant Temporary Access | class_id* |
| DELETE | `/classes/{class_id}/temporary-access/{user_id}` | Revoke Temporary Access | class_id*, user_id* |

## Direct Messaging

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/dm/blocks` | List Message Blocks | — |
| DELETE | `/dm/blocks/{blocked_user_id}` | Unblock Message User | blocked_user_id* |
| POST | `/dm/blocks/{blocked_user_id}` | Block Message User | blocked_user_id* |
| GET | `/dm/contacts` | Return only the users the current account is allowed to message. | — |
| GET | `/dm/conversations` | Return all conversations the current user participates in, ordered by latest message. Includes unread count and last message preview. | — |
| POST | `/dm/conversations` | Start (or resume) a direct 1-to-1 conversation. If a DM between these two users already exists, returns it instead of creating a duplicate. | — |
| POST | `/dm/conversations/broadcast` | Teacher-only: Create a group conversation with ALL parents of a class. Useful for class announcements (réunion, sortie, etc.). | — |
| POST | `/dm/conversations/bulk` | Send one message to multiple users without creating a shared room. | — |
| GET | `/dm/conversations/{conversation_id}/messages` | Return all messages in a conversation (paginated in future). | conversation_id* |
| POST | `/dm/conversations/{conversation_id}/messages` | Send a message via HTTP (alternative to WebSocket for reliability). | conversation_id* |
| POST | `/dm/conversations/{conversation_id}/read` | Mark all messages as read (updates last_read_at timestamp). | conversation_id* |
| POST | `/dm/conversations/{conversation_id}/reports` | Report Conversation Message | conversation_id* |
| GET | `/dm/reports` | List Message Reports | status, limit |
| PATCH | `/dm/reports/{report_id}` | Update Message Report | report_id* |

## Director views

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/admin/students/{student_id}/file` | Everything the school holds about one student, for the administration. | student_id* |
| GET | `/admin/teachers/{teacher_id}/history` | What a teacher did over the last ``days`` days, plus their assignments. | teacher_id*, days |

## Finance / Ecolage

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/finance/invoices` | List Invoices | student_id |
| POST | `/finance/invoices` | Create Invoice | — |
| POST | `/finance/invoices/bulk` | Bill every active student of a class (or of the school) the same fee. | — |
| DELETE | `/finance/invoices/{invoice_id}` | Remove a fee billed by mistake. Fees with payments must have them cancelled first. | invoice_id* |
| PATCH | `/finance/invoices/{invoice_id}` | Update Invoice | invoice_id* |
| POST | `/finance/invoices/{invoice_id}/payments` | Record Payment | invoice_id* |
| GET | `/finance/ledger` | Every fee of the school with its student, class and balance, plus the totals. | — |
| GET | `/finance/my-fees` | A parent's view of one child's fees, payments and receipts. | student_id* |
| POST | `/finance/payments/{payment_id}/cancel` | Undo a payment entered by mistake; the reason stays in the activity log. | payment_id* |
| GET | `/finance/payments/{payment_id}/receipt` | Get Receipt | payment_id* |
| POST | `/finance/reminders` | Remind the parents of unpaid fees. The same fee is not reminded twice within 3 days. | — |
| PUT | `/finance/settings` | Turn automatic reminders on or off (director only). | — |

## Grades

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/classes/{class_id}/grades/` | List Grades | class_id* |
| POST | `/classes/{class_id}/grades/` | Add Grade | class_id* |
| GET | `/classes/{class_id}/grades/export` | Export Grades | class_id* |
| GET | `/classes/{class_id}/grades/export/raw` | Export Grades Raw | class_id* |
| GET | `/classes/{class_id}/grades/student/{student_id}` | Student Grades | class_id*, student_id* |
| DELETE | `/classes/{class_id}/grades/{grade_id}` | Delete Grade | class_id*, grade_id* |
| PATCH | `/classes/{class_id}/grades/{grade_id}` | Update Grade | class_id*, grade_id* |
| POST | `/classes/{class_id}/grades/{grade_id}/approve` | Approve Grade | class_id*, grade_id* |

## Health

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/health` | Health | — |
| GET | `/health/ready` | Readiness | — |

## Homework

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/classes/{class_id}/homework/` | List Homework | class_id* |
| POST | `/classes/{class_id}/homework/` | Add Homework | class_id* |
| DELETE | `/classes/{class_id}/homework/{homework_id}` | Delete Homework | class_id*, homework_id* |
| PATCH | `/classes/{class_id}/homework/{homework_id}` | Update Homework | class_id*, homework_id* |

## Lesson Diary

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/classes/{class_id}/lessons/` | List Lesson Entries | class_id* |
| POST | `/classes/{class_id}/lessons/` | Create Lesson Entry | class_id* |
| DELETE | `/classes/{class_id}/lessons/{lesson_id}` | Delete Lesson Entry | class_id*, lesson_id* |
| PATCH | `/classes/{class_id}/lessons/{lesson_id}` | Update Lesson Entry | class_id*, lesson_id* |

## Media

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/media/attachments/` | List Attachments | parent_type*, parent_id* |
| POST | `/media/attachments/` | Upload Attachment | — |
| DELETE | `/media/attachments/{attachment_id}` | Delete Attachment | attachment_id* |
| GET | `/media/attachments/{attachment_id}` | Get Attachment | attachment_id* |
| GET | `/media/attachments/{attachment_id}/download` | Download Attachment | attachment_id* |

## Monthly report

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/admin/reports/monthly` | One month of activity next to the month before (default: the month in progress). | month |

## Onboarding

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| POST | `/onboarding/register-school` | Self-serve onboarding for a new school. 1. Check if email already exists. 2. Create School (Inactive by default). 3. Create Principal user. 4. Seed Algerian subjects and trimesters. | — |

## Operations

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/metrics` | Prometheus Metrics | — |

## Parent-teacher meetings

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/meetings/slots` | Teachers: their slots. Admins: the school's. Parents: free or own slots of their children's teachers. | include_past_days |
| POST | `/meetings/slots` | A teacher opens bookable meeting slots for one day. | — |
| DELETE | `/meetings/slots/{slot_id}` | Delete Slot | slot_id* |
| POST | `/meetings/slots/{slot_id}/book` | Book Slot | slot_id* |
| POST | `/meetings/slots/{slot_id}/cancel` | Free a booked slot: by the parent who booked it, the teacher or the school administration. | slot_id* |

## Platform Admin

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/platform/schools` | List All Schools | — |
| PATCH | `/platform/schools/{school_id}/activate` | Activate School | school_id* |
| POST | `/platform/schools/{school_id}/subscription` | Add Subscription Payment | school_id* |

## Remarks

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/classes/{class_id}/remarks/` | List Remarks | class_id* |
| POST | `/classes/{class_id}/remarks/` | Add Remark | class_id* |
| GET | `/classes/{class_id}/remarks/student/{student_id}` | Student Remarks | class_id*, student_id* |

## Report cards

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/public/report-cards/{code}` | What the school published for the report card behind a QR code (no account needed). | code* |
| GET | `/report-cards/` | List Report Cards | class_id, semester_id, student_id |
| GET | `/report-cards/preview` | Report cards as they would be published now (nothing is saved). | class_id*, semester_id* |
| POST | `/report-cards/publish` | Publish (or re-publish) the class's report cards for a term and notify parents. | — |
| POST | `/report-cards/unpublish` | Unpublish Report Cards | — |
| GET | `/report-cards/{report_card_id}` | Get Report Card | report_card_id* |

## Schedule / Planning

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| POST | `/schedule/` | Principal/Secretary only: add a slot to the weekly timetable. | — |
| GET | `/schedule/class/{class_id}` | Get Class Schedule | class_id* |
| GET | `/schedule/class/{class_id}/exams` | List Class Exams | class_id* |
| POST | `/schedule/exams` | Teacher/Admin: plan a one-off exam for a class and notify parents. | — |
| DELETE | `/schedule/{slot_id}` | Principal/Secretary only: remove a slot from the timetable. | slot_id* |
| PUT | `/schedule/{slot_id}` | Principal/Secretary only: modify an existing slot and notify parents. | slot_id* |
| POST | `/schedule/{slot_id}/cancel` | Teacher or administration: cancel one session date and notify parents. | slot_id* |
| GET | `/schedule/{slot_id}/cancellations` | List all cancellations for a specific slot. | slot_id* |

## School branding

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/schools/branding` | School Branding | — |
| DELETE | `/schools/branding/logo` | Delete Logo | — |
| PUT | `/schools/branding/logo` | Replace the school logo (director only): PNG, JPEG or WebP, at most 200 KB. | — |

## School setup

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/admin/import/students/template` | A CSV that Excel opens directly (semicolons, UTF-8 with BOM for accents and Arabic). | — |
| GET | `/admin/parent-codes` | Student identifier and PIN of every active student, to print and hand to parents. | class_id |
| GET | `/admin/referral` | The code to share with other schools, and the schools that joined with it. | — |
| GET | `/admin/setup-status` | Where the school stands in its setup, step by step. | — |
| POST | `/admin/setup-status/dismiss` | Hide (or bring back) the checklist for everyone in the school administration. | — |

## Security

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/security/audit-events` | List Audit Events | actor_id, action, category, include_http, resource_type, resource_id, date_from, date_to, limit, offset |
| GET | `/security/audit-events/export` | CSV of the filtered audit log (newest first, at most 5000 rows). The export is itself audited. | actor_id, action, category, include_http, resource_type, resource_id, date_from, date_to |
| POST | `/security/audit-events/retention/purge` | Purge Audit Retention | — |
| GET | `/security/students/{student_id}/export` | Export Student Record | student_id* |

## Student health

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/classes/{class_id}/health-alerts` | Short alerts only (e.g. "allergic to peanuts") for the class's teachers and admins. | class_id* |
| GET | `/infirmary/students` | Every active student with their classes, whether a sheet exists and its short alert. | — |
| DELETE | `/students/{student_id}/health` | Withdraw consent (parent) or erase the sheet (school): the record is deleted. | student_id* |
| GET | `/students/{student_id}/health` | Get Health Record | student_id* |
| PUT | `/students/{student_id}/health` | Save Health Record | student_id* |

## System Administration

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/system/schools` | SuperAdmin only: List all schools. | — |
| POST | `/system/schools/{school_id}/activate` | SuperAdmin only: Activate a school (e.g. after verifying payment). | school_id* |
| POST | `/system/schools/{school_id}/deactivate` | SuperAdmin only: Deactivate a school. | school_id* |
| POST | `/system/schools/{school_id}/subscription` | SuperAdmin only: Add a subscription payment (e.g. cash) for a school. | school_id* |

## Users

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| POST | `/users/` | System-admin-only legacy profile creation endpoint. | — |
| DELETE | `/users/me` | Delete the signed-in parent's account. | — |
| GET | `/users/me` | Get Me | — |
| PUT | `/users/me` | Update Me | — |
| DELETE | `/users/me/push-devices` | Stop pushing to this phone (sign-out). | — |
| POST | `/users/me/push-devices` | Register this phone for push notifications (a user may have several). | — |
| PATCH | `/users/me/push-token` | Register Push Token | — |
| POST | `/users/students` | Create Student | — |
| GET | `/users/students/me` | Parents get a list of their children. | — |
| POST | `/users/students/{student_id}/parents/{parent_id}` | Admins can link parents to students. | student_id*, parent_id* |

## Verification

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| POST | `/verification/link-by-qr` | Link a parent to a student using a temporary QR token. Uses SELECT FOR UPDATE to prevent race conditions (double-scanning). | — |
| GET | `/verification/pending` | List Pending Requests | — |
| POST | `/verification/request` | Request Student Link | — |
| POST | `/verification/{request_id}/approve` | Approve Request | request_id* |
| POST | `/verification/{request_id}/reject` | Reject Request | request_id* |

## notifications

| Method | Path | What it does | Parameters |
| --- | --- | --- | --- |
| GET | `/notifications/` | Get Notifications | — |
| POST | `/notifications/mark-all-read` | Mark All Read | — |
| GET | `/notifications/preferences` | Get Notification Preferences | — |
| PUT | `/notifications/preferences/{notification_type}` | Update Notification Preference | notification_type* |
| PATCH | `/notifications/{notification_id}/read` | Mark Read | notification_id* |
