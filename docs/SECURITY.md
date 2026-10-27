# Security and privacy

This describes how the system protects data. The legal text for users is in
[`SECURITY_PRIVACY_POLICY.md`](../SECURITY_PRIVACY_POLICY.md) and the in-app
privacy policy; it is **not** a legal opinion. Health and fee data are
sensitive under Algerian Law 18-07: get a lawyer's review before launch (see
[`LEGAL_REVIEW_SIGNOFF.md`](../LEGAL_REVIEW_SIGNOFF.md)).

## Layers

1. **Network**: only 80/443 are public; PostgreSQL, Redis and ClamAV stay on the internal Docker network. HTTPS is automatic (Caddy); HSTS and security headers are set. API documentation endpoints are off in production.
2. **Identity**: RS256 JWTs, 30-minute access tokens, 30-day rotating refresh tokens with reuse detection, at most 5 sessions per user, immediate revocation through a per-user token version (password change, access reset, deactivation, sign-out).
3. **Authorisation**: role checks in every route, plus relationship checks (teacher ↔ class ↔ subject, parent ↔ child) in `app/core/access.py`. Teachers cannot read or write grades of subjects they do not teach.
4. **Tenant isolation**: PostgreSQL row-level security, forced, with a non-superuser application role (see [Architecture](ARCHITECTURE.md#multi-tenancy)).
5. **Sensitive data**: health records encrypted in the database; money exact; logos restricted to raster images; uploads malware-scanned.
6. **Detection**: an audit log of writes, sign-ins and sensitive reads, and automatic alerts on bursts of 401/403/429 responses.

## Roles and what the server enforces

| Role | Server-side limits |
| --- | --- |
| Parent | Only linked children (checked per request and in SQL). Cannot message other parents. |
| Teacher | Only assigned classes **and** subjects. Cannot see health records, only the short alert. |
| Secretary | School administration, except managing secretaries/nurses, the logo and automatic-reminder switch (director only). |
| Nurse | A middleware allows only health, account, notification and branding endpoints; everything else returns 403 regardless of the route. |
| Director | Full school administration; cannot reach another school. |
| Platform admin | Schools, subscriptions and platform health; not school content. |

## Authentication details

- **Sign-in** is rate-limited (10 attempts per 5 minutes per IP and email); failures are audited without recording passwords.
- **Parent linking** uses a QR token or student ID + 6-digit PIN. PIN guessing is limited per IP (30 per 15 minutes) and per student (10 per 15 minutes).
- **Staff invitations** are single-use 32-character codes valid 72 hours; the administration can reset access, which also signs the person out.
- **Passwords** are hashed (bcrypt); minimum 8 characters; changing one signs out other devices.
- **Terms** are versioned (`TERMS_VERSION`); a change forces everyone to accept again.

## Sensitive data

- **Health records.** Every field is encrypted with Fernet using `HEALTH_DATA_KEY`. The key must be kept outside the server: without it, backups cannot restore the health fields. Rotation: put the old key in `HEALTH_DATA_PREVIOUS_KEYS`. Records exist only with recorded parental consent; withdrawing consent erases them. Full sheets: administration, nurse and the child's parents; teachers get only the short alert. Every staff view is audited (field *names* are logged, never values).
- **Fees.** Visible to administration and the child's parents only. Payments, cancellations (with reason), reminders and settings are audited.
- **Report cards.** The public verification page exposes only school, student, class, term, average, rank, distinction and date, behind a 12+ character random code and a 60/hour/IP limit. The database policy lets that request read only the card with exactly that code, read-only.
- **PINs and codes** are credentials: they are redacted from logs and never put in the audit metadata.

## The public demo

Disabled unless `PUBLIC_DEMO_ENABLED=true`. Demo tokens carry a `demo` claim; a middleware refuses every write and the chat sockets refuse messages. Visitors share accounts, so their sessions, IPs and browsers are neither stored nor shown, their traffic is not audited or alerted on, demo PINs cannot register a parent, no platform administrator exists in the demo school, and the accounts have a random password nobody knows.

## Logging and audit

- **Application log**: one access line per request with the path only (no query string), request ID (`X-Request-ID`), user and client IP; passwords, tokens, JWTs, invite codes and PINs are redacted everywhere including tracebacks. Uvicorn's own access log is off.
- **Audit log** (`audit_events`): directors see it filtered by person, category and date, and can export CSV (the export is itself logged). Retention: `AUDIT_RETENTION_DAYS` (default 7 years), purge with a platform endpoint.

## Abuse and resource limits

Rate limits on sign-in, code lookups, school sign-up (3/hour), password change, demo sign-in, public verification. Upload size cap (10 MB) with required malware scanning in production. CSV imports are capped (300 teachers per file). Message fan-out to many recipients is capped.

## Supply chain and checks

CI runs `pip-audit` and `npm audit`, a secret scanner on the built web app, production-posture checks (no placeholder secrets, strict CORS, malware scanning required, health key present), JWT key-rotation rehearsal, Alembic release checks and the full test suite including the PostgreSQL RLS tests. Run them locally with the commands in [Development](DEVELOPMENT.md#tests).

## Reporting a problem

Follow [`INCIDENT_RESPONSE_CONTACTS.md`](../INCIDENT_RESPONSE_CONTACTS.md) and the incident section of [`OPERATIONS_RUNBOOK.md`](../OPERATIONS_RUNBOOK.md). For a suspected leak: sign the affected users out (director → team/parent → *Sign out*), rotate the JWT keys (rehearsed by `scripts/rehearse_key_rotation.py`), and preserve the audit log.

## Known limits

- Application-level encryption covers health fields only; other data relies on disk and database protection at the host.
- Grades and attendance entered before the authorship columns existed (migration 0018) do not record who entered them.
- No two-factor authentication, email or SMS delivery of codes.
- Legal review, hosting in Algeria and staging evidence are launch gates tracked in [`PRODUCTION_READINESS_CHECKLIST.md`](../PRODUCTION_READINESS_CHECKLIST.md).
