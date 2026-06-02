# EduConnect Security And Privacy Policy

This file is the implementation contract for access control, audit, retention, consent, and abuse prevention. It is intentionally operational: database policies, API authorization, and product behavior should be checked against these rules before release.

## Tenant Isolation

- Every school-scoped table must carry `school_id`.
- PostgreSQL RLS must be enabled for school-scoped tables, using `app.current_school_id`.
- RLS must be forced on school-scoped tables so table ownership does not bypass tenant policy.
- The API database role must be `NOSUPERUSER` and `NOBYPASSRLS`.
- API queries must still filter by `school_id`; RLS is the final guard, not the only guard.
- Cross-school reads, writes, exports, messages, and file downloads are forbidden unless the actor is `system_admin`.

## Audit Logs

- Mutating API requests and sensitive reads are written to `audit_events`.
- Auth events record successful login, failed login, password setup required, logout, session revocation, and refresh failures.
- Audit events include actor, role, school, resource hint, HTTP method/path, status, IP address, device fingerprint, platform, and user agent.
- School admins can view only their school's audit events through `GET /security/audit-events`.
- System admins may use audit logs for platform investigation. Audit logs must not be edited by school users.

## Session And Device Management

- Refresh-token families represent device sessions.
- Users are limited to five active session families; the oldest families are revoked automatically.
- Users can list their sessions with `GET /auth/sessions`.
- Users can revoke a session family with `DELETE /auth/sessions/{family_id}`.
- New-device login events produce a critical `SECURITY` notification when the account already has an active session.
- Reusing an already-rotated refresh token invalidates that token family.

## Messaging Abuse Controls

- One-to-one and bulk messages are rate limited in the app layer.
- Bulk DM fan-out creates separate private conversations; it must never create a shared parent room.
- Bulk sends are capped at 50 recipients per request.
- Parent replies to class-wide/group broadcasts are blocked; parents must reply in private DMs.
- Blocking/reporting workflows are still a product requirement and should be added before wide public rollout.

## Notification Consent

- Users can set notification preferences through `GET /notifications/preferences` and `PUT /notifications/preferences/{type}`.
- `ALL` acts as the fallback preference type.
- `ACCOUNT` and `SECURITY` notifications are critical and may bypass opt-out.
- Teachers do not get a generic "notify everyone" capability; notifications should be triggered by authorized domain actions such as grades, attendance, class announcements, and schedule changes.

## Temporary Access

- Substitute or temporary teacher access is granted only by school administration.
- Temporary access is tied to a class, has `starts_at` and `expires_at`, and is either `read` or `write`.
- Read access allows viewing class records and messaging linked parents/teachers.
- Write access is required for creating or changing grades, attendance, homework, lessons, and similar class records.
- Expired access must be treated as no access.

## Student Record Export And Retention

- Parents can export only records for their linked children through `GET /security/students/{student_id}/export`.
- School admins can export records only for students in their school.
- Parent exports include approved grades, attendance, remarks, and class enrollment. Admin exports may include unapproved grades for school operations.
- When a parent is unlinked, `student_parents` access is removed and that parent's refresh tokens are revoked.
- Student records should be archived on transfer or graduation, not hard-deleted during ordinary school operations.
- Hard deletion should be restricted to system-admin workflows after contractual/legal retention windows and should preserve required audit evidence.

## Files And Media

- Uploaded files must be registered in `media_attachments`.
- Attachments inherit access from their parent record (`grade`, `attendance`, `remark`, `homework`, `message`, or similar).
- File storage keys must not be exposed as public permanent URLs.
- Downloads should use short-lived signed URLs or streaming endpoints that re-check the parent record authorization.
- Deletes should be soft deletes (`deleted_at`) unless a system-admin retention job is performing approved hard deletion.
