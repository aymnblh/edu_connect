# EduConnect Backend

Private FastAPI backend for the EduConnect B2B school SaaS.

## Architecture

- FastAPI
- PostgreSQL 16 with SQLAlchemy async
- Alembic migrations
- Local JWT auth with RSA keys
- Tenant isolation by `school_id`
- WebSockets for real-time messaging
- ntfy for local/private push notifications

## Local Start

```bash
cp .env.example .env.local
python manage.py generate-keys
docker compose -f docker-compose.local.yml up --build
```

API: `http://localhost:8000`
Docs: `http://localhost:8000/docs`
ntfy: `http://localhost:8080`
Liveness: `http://localhost:8000/health`
Readiness: `http://localhost:8000/health/ready`

## Required Environment

- `DATABASE_URL`
- `PRIVATE_KEY_PATH`
- `PUBLIC_KEY_PATH`
- `SERVER_FINGERPRINT_SALT`
- `PLATFORM_SECRET`
- `NTFY_BASE_URL`
- `NTFY_TOPIC_PREFIX`

## Auth Flow

1. User logs in with email and password against `POST /auth/login`.
2. Backend verifies the local password hash.
3. Backend returns an access token and a refresh token.
4. Mobile/web calls protected APIs with `Authorization: Bearer <access_token>`.
5. Refresh token rotation is handled by `POST /auth/refresh`.

## Product Modules

- Schools and activation
- Users, students, classes, and teacher assignments
- Attendance, grades, homework, remarks
- Direct messages and class announcements
- Schedule and sessions
- Tuition invoices, payments, and receipts
- In-app notifications and ntfy push

No Firebase service account, Firebase Auth, Firestore, or cloud database is required.

## Production Start

```bash
cp .env.production.example .env.production
python manage.py generate-keys --output secrets/
docker compose --env-file .env.production -f docker-compose.yml up --build -d
```

Before running production, replace every placeholder in `.env.production`, set `APP_ENV=production`, and keep `.env.production` plus `secrets/` out of source control and Docker build context.

Operational backup, restore, rollback, observability, staging, and incident response procedures live in `../OPERATIONS_RUNBOOK.md`.

Production helper scripts:

```bash
python scripts/check_production_posture.py
python scripts/rehearse_key_rotation.py
ENV_FILE=.env.production ./scripts/backup_educonnect.sh
STAGING_ENV_FILE=.env.staging BACKUP_ARCHIVE=./backups/educonnect-YYYYMMDDTHHMMSSZ.tar.gz ./scripts/restore_drill.sh
./scripts/verify_deployment.sh
```

## Verification

```bash
python -m pip install -r requirements-dev.txt
python -m compileall app alembic tests
alembic heads
python -m pytest
```
