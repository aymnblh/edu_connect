**Title:** Production readiness: security fixes, account lifecycle, and school features

## Summary

Security and access-control fixes found during a production-readiness review, plus the school features built on top of them.

### Security and access control
- **Child PIN brute force (critical).** Rate limits were keyed on the guessed PIN, so each guess got a fresh budget. Limits are now per IP (30 per 15 min) and per student ID (10 per 15 min). `/verification/request` had no limit and now has one.
- **Teachers limited to their own subjects.** This covers the grade list, per-student grades, adding grades, both report-card exports and homework. Teachers can no longer join classes with a join code; admins assign them.
- **Subject reassignment** removes the previous teacher's access to the class.
- **Sessions:** access tokens carry a `token_version`. Password change, access reset and deactivation take effect immediately, including on open WebSockets.
- **Production exposure:** `/docs`, `/redoc` and `/openapi.json` are disabled in production. PyJWT is upgraded from 2.13.0 to 2.15.0 (13 advisories), so `pip-audit` is clean. The axios SSRF advisory is patched.
- **Smaller fixes:** nginx dropped the security headers in `location` blocks; the new admin endpoint crashed on a missing column; Flutter Android backups are now disabled.

### Accounts
- **Staff:** admins can deactivate staff, and "Reset access" issues a new 72-hour code (expired invites, forgotten passwords).
- **Parents:** admins can reset a parent's access with a code.
- **Everyone:** change password (other sessions are signed out).
- **Account deletion:** deleting from the app used to only sign the user out. Parents are now anonymized (links, sessions and notifications removed; history kept). Staff are told the school closes their account.

### Teaching
- **Corrections:** edit or delete grades (until approved), homework and lessons (author or admin), and correct past attendance (parents are told). All changes are audited.
- **Flutter grade form:** pick the student and subject from lists. It used to send a typed student ID that the API rejected, so grading from the app didn't work.

### New features
- **Announcements and calendar:** school-wide or per class, five categories, read receipts.
- **Term report cards:** preview, publish, re-publish or unpublish. Each publication is a saved snapshot. Parents view and print a PDF on web and in the app.
- **Parent–teacher meetings:** teachers open slots, parents book them (atomic claim, one upcoming meeting per teacher per child). Times are in Algeria time.
- **Director early warning:** students at risk with reasons, weekly attendance trend, attendance by class.

### Log control
- **Server logging:** `LOG_LEVEL` and `LOG_FORMAT` (JSON in production). Each request gets an ID, returned in `X-Request-ID` and written on every log line. One access line per request, with the path only and no query string; uvicorn's access log is off. Passwords, tokens, JWTs, invite codes and PINs are redacted, including in tracebacks.
- **Activity log for directors:** a web "Journal" tab with category, person and date filters, plain-language action names, paging and an audited CSV export.
- **Session control:** "My devices" on web and in Flutter, to sign out one device or all other devices immediately. Admins can sign out a staff member or a parent.

### Student file, teacher history, health sheet
- **Health and emergency sheet** (sensitive data, migration `0018`, RLS): created only with recorded parent consent, given in the app or attested from a paper form. The full sheet is visible to the administration and the parents. Teachers see only a short alert. Every staff view and change is audited. Parents can withdraw consent, which erases the sheet.
- **Who entered what:** grades store `created_by` and attendance stores `recorded_by`.
- **New director views:** "Dossier complet" for each student and "Historique" for each teacher, with 30-day activity.

### Growth: demo, setup, monthly report
- **Public demo** (`PUBLIC_DEMO_ENABLED`, off by default): "Découvrir sans compte" on the web login page (director, teacher, parent) and in the app (parent, teacher). Demo sessions are read-only: a middleware refuses every write and the chat WebSockets refuse messages, and a banner explains it, with "Créer mon école". Visitors share one account, so their sessions, IPs and browsers are neither shown nor kept, and their traffic isn't audited or alerted on. Demo PINs can't register a parent. The demo school is rebuilt every night after 03:00 Algeria time. No platform admin is created and the password is random.
- **Richer demo data:** the whole trimester of Sunday–Thursday attendance, three grades per subject, a struggling student, grades awaiting approval, absence notifications, everyday activity, a health record, announcements and meetings.
- **Setup checklist** on the director overview: seven steps with progress, a dismiss button, a downloadable Excel/CSV template, and printable parent-code cards (audited). The student import now places students in an existing class from a `classe` column.
- **Monthly report** tab with print/PDF: attendance, parent notifications, active parents and teachers, grades, homework, lessons, messages, announcements, report cards and meetings, next to the previous month, plus attendance by class. Directors get a notification on the 1st (once per school, safe with several workers).

### School fees
The tuition API existed, but no screen used it. It now covers the whole cycle:
- **Director / secretary "Frais scolaires" tab:** bill a class or the whole school at once (no double billing), record payments (cash, bank transfer, CCP/BaridiMob, cheque) with a printable receipt, edit or delete fees, cancel a payment with a reason, totals (billed, collected, outstanding, overdue, collection rate) and per class, filters.
- **Reminders:** per student or "remind all overdue" (not twice within 3 days), and optional automatic reminders (3 days before, then weekly when late, at most 4, 08:00–20:00 Algeria time).
- **Parents:** "Frais" tab on web and "Frais scolaires" in the app with the balance, due dates and every receipt; they're notified when a payment is recorded.
- Payments, cancellations, reminders and settings are audited; the monthly report shows fees collected; the privacy policy describes fee data (terms version `privacy-terms-2026-10-24`).

### Remaining work done in this PR
- **Bugs:** receipt numbers could repeat after a cancelled payment (now random and dated); inviting staff with an email used in another school crashed (row security hid it from the duplicate check); the nightly demo rebuild stalled the API for seconds (13 bcrypt hashes, now one).
- **Fresh installs:** migrations `0013`, `0014`, `0018`, `0019` failed on an empty database because the baseline creates tables from the current models; they now use `IF NOT EXISTS` like the older migrations. Verified from an empty Postgres 16 through `0025`.
- **Exact money:** tuition amounts are `NUMERIC(12,2)` and fee arithmetic uses `Decimal`.
- **Teacher import from CSV** (it used to do nothing), with a printable code sheet.
- **School logo** on receipts, report cards, the monthly report and code sheets.
- **Health data encrypted at rest** (`HEALTH_DATA_KEY`, required in production, rotation supported).
- **School nurse role**, limited server-wide to health endpoints, with web and mobile screens.
- **Mobile:** demo banner, director monthly report, fees (collect, remind) and setup checklist; nurse screen.
- **Report cards:** Algerian distinctions and QR verification with a public check page.
- **Referral** (2 months each), **free first trimester** at activation, public **/pricing** page.

### Other fixes
- Schools that signed up between January and August got next year's trimesters.
- The overview "absence rate" counted late arrivals.
- Light-skin badge contrast was about 1.7:1 for warnings.
- Flutter secretary invite codes didn't work.
- The Flutter parent report-card button always showed "no data".
- The privacy policy now has one consistent contact email and version.
- Flutter iOS: photo permission text, a privacy manifest, and a CI job that builds iOS without signing.

## Database migrations
`alembic upgrade head` applies `20261012_0013` to `20261024_0025`:
- user `deactivated_at` and `token_version`
- `homework.created_by`
- `announcements`, `announcement_classes`, `announcement_reads`
- `report_cards`
- `meeting_slots`
- `student_health_records`, `grades.created_by`, `attendance.recorded_by`
- `tuition_invoices.last_reminded_at`, `tuition_invoices.reminder_count`
- tuition amounts as `NUMERIC(12,2)`; `schools.logo_data`; health fields as encrypted text; `nurse` role; `report_cards.verify_code` with a lookup policy; `schools.referral_code` and `referred_by`

**New required production setting:** `HEALTH_DATA_KEY` (`python manage.py generate-health-key`); keep a copy off the server.

Every new school-scoped table has RLS enabled and forced, using the same tenant policy as the existing tables. `TERMS_VERSION` changed, so users will be asked to accept the terms again.

## Test plan
- [x] Backend: `pytest` gives 242 passed, including the 10 Postgres/RLS tests, on a database migrated from empty. The 9 skipped are the Postgres/RLS tests, which run in CI.
- [x] Flutter: `flutter analyze` is clean and 25 tests pass (some parse responses captured from the real API).
- [x] Web: `tsc -b`, `eslint` and `vite build` are clean.
- [x] Director insights panel, student file, setup checklist, parent-code cards, monthly report, login demo buttons, fees tab, payment and receipt flow and parent fees tab rendered with sample data and inspected (desktop and phone width).
- [x] Demo seed dry-run against a fake session: no platform admin, Sunday–Thursday only.
- [x] End to end against a running API and Postgres: fees, setup, monthly report, teacher import, public demo (rebuild, read-only, privacy), automatic reminders, monthly notification, health encryption, nurse access, report card verification, referral.
- [ ] Print preview of the parent-code cards and the monthly report.
- [ ] Click through on a local stack (`docker compose -f edu_connect_backend/docker-compose.local.yml up`):
  - [ ] Director: publish announcements and report cards; deactivate and reset staff; reset parent access.
  - [ ] Teacher: grade and homework dropdowns, edit/delete, attendance correction, meeting slots.
  - [ ] Parent: announcements, report card print/PDF, meeting booking and cancel, change password, delete account.
- [ ] iOS: `flutter build ipa` on a Mac.

## Not in this PR
- Push notifications when the app is closed (APNs/FCM).
- Sending codes by email.
- SMS.
- Online payment (SATIM).
- Moving hosting to Algeria, which the privacy policy states.
- Staging evidence for the two remaining launch gates.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
