# Development guide

## Prerequisites

- Python 3.10+ (CI uses 3.10; Docker uses 3.12), Node 22, Flutter (stable channel), Docker Desktop.
- On Windows the scripts work in Git Bash or PowerShell; commands below use bash syntax.

## Run it locally

### Backend

```bash
cd edu_connect_backend
python -m venv .venv && source .venv/Scripts/activate    # Windows; use bin/activate elsewhere
pip install -r requirements-dev.txt
cp .env.example .env.local        # then adjust DATABASE_URL / REDIS_URL if not using the compose file
python manage.py generate-keys     # RSA keys into secrets/
docker compose -f docker-compose.local.yml up -d db redis
alembic upgrade head
uvicorn app.main:app --reload      # http://localhost:8000, docs at /docs
```

Demo data for every screen (a fictional school with a trimester of activity):

```bash
DEMO_PASSWORD='choose-one' python scripts/seed_demo_presentation_data.py --reset-demo
```

Accounts are listed in `DEMO_PRESENTATION_ACCOUNTS.md` (`director@demo.educonnect.dz`, `teacher.math@…`, `parent.nadia@…`, …).

### Web

```bash
cd edu_connect_web
npm ci
VITE_API_BASE_URL=http://localhost:8000 npm run dev      # http://localhost:5173
```

### Mobile

```bash
cd edu_connect
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000 --dart-define=WS_BASE_URL=ws://10.0.2.2:8000
```

(`10.0.2.2` is the host machine from an Android emulator.)

## Tests

| What | Command | Notes |
| --- | --- | --- |
| Backend | `cd edu_connect_backend && APP_ENV=test python -m pytest -q` | ~240 tests, mostly with in-memory fakes; no database needed. |
| Backend + PostgreSQL/RLS | `RUN_DB_TESTS=1 TEST_DATABASE_URL=postgresql+asyncpg://… python -m pytest -q` | Needs a database already migrated with `alembic upgrade head`; proves row-level security as a non-superuser. |
| Web | `cd edu_connect_web && npm run lint && npx tsc -b && npm run test:workspace && npm run test:env` | Then `npm run build` and `npm run test:preview` (smoke test of the built app). |
| Mobile | `cd edu_connect && flutter analyze && flutter test` | `flutter analyze` fails on **any** issue, including info-level lints. |
| Everything CI runs | see `.github/workflows/production-readiness.yml` | Plus `pip-audit -r requirements.txt` and `npm audit --audit-level=low`. |

Test helpers (`tests/test_access_control_boundaries.py`): `FakeDb`, `FakeResult`, `make_user`, `make_request`, `run`; `tests/test_growth_features.py` adds `LenientDb` (also answers the row-security `set_config` statements). Tests that compare model classes should compare by name, because some test modules reload `app.models`.

## Continuous integration

`.github/workflows/production-readiness.yml` runs on every pull request and push to `main`: backend (audit, compile, posture checks, key rotation, Alembic release shape, Docker config, migrations as a restricted role, tests with PostgreSQL), web (audit, lint, tests, build, secret scan, preview smoke), Flutter (config validation, analyze, tests, debug APK) and iOS (unsigned release build). Reproduce a failure locally by running the same step with the same environment variables.

## Database migrations

```bash
cd edu_connect_backend
alembic revision -m "short description"       # edit the new file in alembic/versions/
alembic upgrade head
python scripts/check_alembic_release.py       # single head, expected shape
```

Conventions:
- Name files `YYYYMMDD_00NN_topic.py`; keep `down_revision` linear (one head).
- Write **idempotent** SQL (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`): the baseline creates tables from the current models, so a fresh database may already have your column.
- A new table with `school_id` **must** enable and force RLS and add the `tenant_isolation_<table>` policy; the PostgreSQL test fails otherwise.
- Adding a value to a PostgreSQL enum: `ALTER TYPE … ADD VALUE IF NOT EXISTS`.

## Recipes

**Add an endpoint.** Create the route in `app/modules/<domain>/routers/`, check the role first and the relationship next, use `record_audit_event` for sensitive actions, include the router in `app/api/router.py`, add tests with `FakeDb`, then regenerate [`API_REFERENCE.md`](API_REFERENCE.md).

**Add a table.** Model in `modules/<domain>/models.py` (import it in `app/models.py`), a migration with RLS, a test. Document it in [`DATA_MODEL.md`](DATA_MODEL.md).

**Add a web screen.** A component in `src/components/`, mount it from the right dashboard (`DirectorDashboard` tabs are declared in `directorTabs` and `tabFromPath`; the route goes in `App.tsx` and the sidebar in `Sidebar.tsx`), texts in `src/lib/i18n.ts` for **fr, ar and en**, then lint and type-check.

**Add a mobile screen.** `lib/features/<domain>/` with a repository, providers and the screen; register the route in `app_router.dart`; use `useSafeArea: true` on every modal bottom sheet (a test enforces it); texts via `pick(ar, fr, en)`.

**Add a setting.** Field in `Settings` (`app/core/config.py`), a line in the three `.env*.example` files, a row in [`CONFIGURATION.md`](CONFIGURATION.md), and a production check if it must be set.

**Add a role.** Enum value (+ migration), `normalizeWorkspaceRoles`/routes on the web, `UserRole` in Flutter, middleware or route checks, and tests proving what it cannot reach.

## Conventions

- Backend: async SQLAlchemy; scope every query by `school_id`; money in `Decimal`/`NUMERIC`; dates in UTC, school-day logic in Algeria time (`ALGERIA_TZ`); user-facing server messages in French.
- Web: strict TypeScript, no `any`; React hooks lint rules are on (`set-state-in-effect`, `static-components`); every user-visible string goes through `t()`.
- Mobile: Riverpod providers, `ApiService.instance` for HTTP; keep Arabic right-to-left correct (use `EdgeInsetsDirectional`).
- Colours: the light skin tokens in `index.css`; data colours were validated for contrast and colour-blind separation (single-series blue `#2a78d6`).
- Commits: small, imperative, with the reason in the body; never commit `.env*` (except examples), keys or generated evidence.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| API refuses to start in production | A production check failed; the error lists them (health key, CORS, secrets, malware scan). |
| `column … already exists` during `alembic upgrade` | A non-idempotent migration on a fresh database; use `IF NOT EXISTS`. |
| Rows missing in a test with PostgreSQL | The app role has no RLS context: set `app.current_school_id` (see `set_request_rls_context`). |
| `flutter analyze` fails in CI but not locally | A newer Flutter reports new lints; fix them or pin the version. |
| Web build fails on `VITE_API_BASE_URL` | Set it (production builds require it). |
| Email already in use but nobody sees it | The user belongs to another school (row security hides it); that is expected. |
