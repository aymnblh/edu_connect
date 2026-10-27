# Architecture

## Overview

```text
 Flutter app (Android/iOS)     React web app
            \                      /
             \   HTTPS + WebSocket /
              v                   v
        Caddy (TLS, reverse proxy; serves the web build)
                      |
                FastAPI server  ----------  Redis (rate limits, alerts, WebSocket fan-out)
                      |
                PostgreSQL 16 (row-level security per school)
                      |
   ClamAV (upload scanning)     Firebase Cloud Messaging / ntfy (push)
```

| Component | Technology | Folder |
| --- | --- | --- |
| API | Python 3.10+ (3.12 in Docker), FastAPI, SQLAlchemy 2 (async), Alembic | `edu_connect_backend/` |
| Database | PostgreSQL 16 | migrations in `alembic/versions/` |
| Cache / pub-sub | Redis 7 | |
| Web | React 19, TypeScript, Vite, TanStack Query, recharts | `edu_connect_web/` |
| Mobile | Flutter, Riverpod, go_router, Dio | `edu_connect/` |
| Proxy | Caddy 2 (automatic HTTPS) | `edu_connect_backend/Caddyfile` |
| CI | GitHub Actions | `.github/workflows/production-readiness.yml` |

## Backend layout

```text
app/
  main.py            application, middleware order, lifespan (background jobs)
  api/router.py      includes every module's router
  core/              config, security (JWT), middleware, RLS helpers, audit, rate limit,
                     logging, crypto, background jobs
  db/                engine, session, Base
  modules/<domain>/  models.py, routers/, schemas.py, domain logic (one folder per domain)
  utils/             notifications, push (ntfy), fcm (Firebase)
  ws_manager.py      WebSocket rooms over Redis
alembic/versions/    numbered migrations (0001 … 0026)
scripts/             deployment, verification and launch-evidence tools
tests/               unit, access-control and (optionally) PostgreSQL tests
```

Domains: `auth`, `users`, `schools` (admin, setup, branding, referral, insights, director views, system),
`academics` (classes, grades, homework, lessons), `attendance` (attendance, remarks),
`messaging` (class chat, direct messages), `notifications`, `schedule`, `finance` (fees),
`reports` (report cards, monthly report), `announcements`, `meetings`, `health`, `core` (media, security/audit), `demo`.

## Request flow

1. **Middleware** (outermost first): request logging (assigns `X-Request-ID`) → observability metrics → CORS → security headers → tenant context → school activation/subscription check → audit and security alerts → nurse scope guard → demo read-only guard (innermost).
2. **Authentication** (`get_current_user`): verifies the RS256 access token, loads the user, then checks role and school still match the token, and `session_rejection` (deactivated, password not set, `token_version` changed).
3. **Authorisation** in the route: role checks, and for teachers/parents the relationship checks (assigned class and subject; linked child) in `app/core/access.py`.
4. **Database**: the session sets `app.current_school_id` so PostgreSQL row-level security filters every school table, even if a query forgets a `school_id` condition.
5. **Audit**: sensitive actions call `record_audit_event`; selected reads and every write are also logged by middleware.

## Multi-tenancy

Every table with a `school_id` has **row-level security enabled and forced**, with the policy `school_id = current_setting('app.current_school_id')`. A few narrow, read-only exceptions exist for flows where the caller cannot know the school yet (sign-in by email, invite code, QR token, student ID + PIN, public report-card verification code): each is a separate policy keyed on a session variable set only by that flow. The application connects as a non-superuser role so RLS cannot be bypassed; `tests/test_postgres_rls_integration.py` proves this and fails if a new school table lacks a policy.

## Authentication and sessions

- Access token: RS256 JWT, 30 minutes. Refresh token: 30 days, **rotated on every use**, with reuse detection (reuse kills the whole session family). At most 5 session families per user.
- Tokens carry `tv` (token version): changing a password, resetting access, deactivating or signing someone out increments it, which invalidates their access tokens immediately, including open WebSockets.
- Key rotation: a previous public key can be configured so tokens signed before a rotation stay valid until they expire.
- The web app keeps the refresh token in an HTTP-only cookie when “remember this device” is on.

## Real time

`ws_manager.py` keeps WebSocket rooms (class chat, conversations) and uses Redis pub/sub so several API instances share rooms. The first frame must be `{"type":"auth","token":…}`; the token is re-checked against the user's current state. Demo sessions may read but not send.

## Background jobs

Started with the API (`app/core/background.py`), each safe to run on several instances:

| Job | Frequency | Does |
| --- | --- | --- |
| Monthly report notifications | hourly | On the 1st (Algeria time), notifies directors that last month's report is ready; remembers the month per school. |
| Automatic fee reminders | hourly | For schools that enabled it: heads-up before the due date, weekly reminders when late; rows locked with `SKIP LOCKED`. |
| Demo refresh | every 30 min (only if `PUBLIC_DEMO_ENABLED`) | Rebuilds the demo school once a day after 03:00 Algeria time; a PostgreSQL advisory lock keeps it to one instance. |

Disable them all with `BACKGROUND_JOBS_ENABLED=false` (for example for a one-off worker split).

## Notifications and push

`create_notification` (in `app/utils/notifications.py`) writes the in-app notification, then:
- sends to the optional **ntfy** topic (private, self-hosted transport used while the app is open), and
- sends to every phone registered in `push_devices` through **Firebase Cloud Messaging** (`app/utils/fcm.py`, HTTP v1 with a service-account JWT; dead tokens are deleted). Security and account alerts always go; other types follow the user's preferences.

The mobile app registers its token after sign-in (`push_service.dart`) and removes it on sign-out. Without Firebase settings everything still works through the in-app list and polling.

## Sensitive data

Health fields are encrypted in the database with Fernet (`app/core/crypto.py`, key `HEALTH_DATA_KEY`, rotation through `HEALTH_DATA_PREVIOUS_KEYS`). Money uses `NUMERIC(12,2)` and Python `Decimal`. School logos are stored as small data URLs (PNG/JPEG/WebP only, 200 KB max). Uploaded files are stored privately and virus-scanned by ClamAV.

## Web app

Routes live in `src/App.tsx`; each workspace is a page (`DirectorDashboard`, `TeacherDashboard`, `ParentDashboard`, `NurseDashboard`, `SuperAdminDashboard`) composed of panels in `src/components/`. Data fetching uses TanStack Query against the API (`src/lib/api.ts` attaches tokens and refreshes them). Texts are in `src/lib/i18n.ts` (key → `{fr, ar, en}`; a missing key shows the key itself). Styles are plain CSS in `src/index.css` with design tokens.

## Mobile app

`lib/features/<domain>/` each hold a repository (API calls), providers (Riverpod) and screens. Routing and role-based redirects are in `lib/core/routing/app_router.dart`. Texts use small `pick(ar, fr, en)` helpers or ARB files for the shared screens (`lib/l10n/`). Startup configuration comes from `--dart-define` values (`lib/core/constants/app_constants.dart`).

## Design decisions worth knowing

- **Row-level security over per-query filtering**: a forgotten filter cannot leak another school's data.
- **Server enforces roles; clients only hide buttons.** The nurse and demo restrictions are middleware, so a forgotten check in a route cannot widen them.
- **Snapshots for official documents** (report cards) instead of recomputing, so an issued document never silently changes.
- **No online payments, no email/SMS**: fewer external dependencies and compliance exposure; codes are handed over in person.
- **Everything optional is off by default** (demo, push, ntfy) and the app degrades gracefully without it.
