# EduConnect Production Readiness Checklist

EduConnect stores sensitive student data, so production readiness means the system can prove tenant isolation, relationship-based access control, auditability, recoverability, and operational safety.

## Release Gates

- [ ] `alembic upgrade head` succeeds on a staging copy of production-like data.
- [x] Backend tests pass: `python -m compileall app alembic tests` and `python -m pytest -q`.
- [x] Flutter analysis passes: `flutter analyze`.
- [x] Web build passes for the active web client.
- [x] No secrets are committed or bundled in frontend artifacts.
- [x] Production environment uses `APP_ENV=production`.
- [x] CORS is restricted to approved production domains.
- [x] RSA signing keys exist, are backed up, and key rotation has been rehearsed.

## Access Control And RLS

- [x] Every school-scoped table has a non-null `school_id`, except approved platform/audit exceptions.
- [x] PostgreSQL RLS is enabled and forced for every school-scoped table.
- [x] RLS policies use `app.current_school_id` and reject cross-school reads/writes.
- [x] CI runs PostgreSQL integration tests proving tenant read/write isolation.
- [x] Production Docker config uses a non-superuser, `NOBYPASSRLS` app database role.
- [x] API code also filters by `school_id`; RLS is the final guard.
- [x] Parent, teacher, admin, temporary staff, and system-admin paths have automated tests.
- [x] Dual-role users are tested with workspace switching so teacher and parent contexts do not bleed.
- [x] Direct messages are visible only to explicit participants.
- [x] Class messages are visible only to their resolved audience.
- [x] Parent-to-parent messaging is blocked unless a school admin explicitly enables it.
- [x] Grades, attendance, remarks, exports, and media downloads enforce relationship checks.

## Audit And Compliance

- [x] Mutating requests and sensitive reads create audit events.
- [x] Login success/failure, refresh-token reuse, logout, and session revocation are audited.
- [x] Audit events include actor, role, school, IP, device fingerprint, user agent, path, action, and timestamp.
- [x] School admins can view only their school's audit events.
- [x] Audit logs have a retention policy and cannot be edited by school users.
- [x] Data export flows are logged.
- [x] Legal review is complete for Algerian personal data protection obligations.

## Privacy And Retention

- [x] Parent exports include only linked children.
- [x] Student transfer/graduation archives data instead of ordinary hard delete.
- [x] Parent unlinking revokes relationship access and active sessions.
- [x] Hard deletion is restricted to approved retention jobs.
- [x] Backups follow the same retention and deletion policy.

## Sessions And Devices

- [x] Users can list and revoke their active sessions.
- [x] Refresh-token rotation is enabled and reuse invalidates the token family.
- [x] New-device login notifications are sent as critical security notifications.
- [x] Suspicious login thresholds are defined and monitored.
- [x] Session limit behavior is tested.

## Files And Media

- [x] Upload endpoints register rows in `media_attachments`.
- [x] Download endpoints re-check the parent record's authorization.
- [x] File URLs are short-lived signed URLs or streamed through authorized endpoints.
- [x] Attachment delete is soft-delete by default.
- [x] File type and size restrictions are enforced.
- [x] Malware scanning or equivalent storage protection is in place before public launch.

## Abuse Prevention

- [x] Login rate limits use a shared store such as Redis, not process memory.
- [x] Messaging rate limits use a shared store such as Redis.
- [x] Bulk messaging has caps, audit logs, and clear sender attribution.
- [x] Blocking/reporting workflows are implemented or launch scope explicitly excludes open messaging.
- [x] Alerting exists for repeated 401/403/429 spikes.

## Operations

- [x] CI runs backend tests, frontend builds, linting, and migration checks.
- [x] Database backups and restore drills are documented and tested.
- [x] Observability covers API errors, latency, database connection pool, failed jobs, and auth failures.
- [x] Rollback strategy is documented for app deploys and migrations.
- [x] Incident response contacts and escalation paths are documented with real named contacts.
- [ ] Staging mirrors production auth, RLS, storage, and tenant settings using the real staging environment.
