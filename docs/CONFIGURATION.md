# Configuration reference

Three places are configured: the **server** (environment variables), the **web
build** (Vite variables) and the **mobile build** (`--dart-define`). Secrets
never go into Git: server files `.env.*` are ignored; only `*.example` files are
committed.

## Server (`edu_connect_backend`)

Settings are read from the environment (and `.env` in development) by
`app/core/config.py`. In production (`APP_ENV=production`) the server **refuses
to start** unless the production checks below pass.

Create a production file with `python3 scripts/generate_production_env.py --output .env.production`
(it generates every secret and the health key), then edit domains and backups.
Templates: `.env.example`, `.env.production.example`, `.env.staging.example`.

### Core

| Variable | Default | Meaning |
| --- | --- | --- |
| `APP_ENV` | `development` | `development`, `test`, `staging` or `production`. |
| `DATABASE_URL` | required | `postgresql+asyncpg://user:password@host:5432/db`. In production use the non-superuser application role. |
| `REDIS_URL` | `redis://localhost:6379/0` | Rate limits, alerts and WebSocket fan-out. |
| `CORS_ORIGINS` | empty | Comma-separated HTTPS origins of the web app. Required and strict in production. |
| `CREATE_TABLES_ON_STARTUP` | `false` | Development convenience only; must be `false` in production (use Alembic). |
| `LOG_LEVEL` / `LOG_FORMAT` | `INFO` / auto | `json` in production, `text` locally. |

### Authentication and security

| Variable | Default | Meaning |
| --- | --- | --- |
| `PRIVATE_KEY_PATH`, `PUBLIC_KEY_PATH` | `secrets/*.pem` | RSA keys for JWTs (`python manage.py generate-keys`). |
| `PREVIOUS_PUBLIC_KEY_PATH` | none | Old public key kept during a key rotation. |
| `JWT_ALGORITHM` | `RS256` | Must stay `RS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | |
| `MAX_ACTIVE_SESSION_FAMILIES` | `5` | Devices signed in per user. |
| `SERVER_FINGERPRINT_SALT` | required | Salt for device fingerprints; ≥ 32 random characters in production. |
| `PLATFORM_SECRET` | required | Protects platform-only endpoints such as `/metrics`; ≥ 32 random characters in production. |
| `AUDIT_RETENTION_DAYS` | `2555` | How long the activity log is kept (7 years). |
| `SECURITY_ALERT_STATUS_CODES`, `…_THRESHOLD`, `…_WINDOW_SECONDS`, `…_COOLDOWN_SECONDS` | `401,403,429`, `10`, `300`, `900` | When a burst of refused requests raises a security alert. |
| `HEALTH_DATA_KEY` | empty | **Required in production.** Fernet key encrypting health records (`python manage.py generate-health-key`). Back it up off the server. |
| `HEALTH_DATA_PREVIOUS_KEYS` | empty | Old keys (comma-separated) kept after changing `HEALTH_DATA_KEY`. |

### Files and scanning

| Variable | Default | Meaning |
| --- | --- | --- |
| `MEDIA_UPLOADS_ENABLED` | `true` | Allow attachments. |
| `MEDIA_STORAGE_PATH` | `media/attachments` | Private directory (never a public web root). |
| `MEDIA_MAX_UPLOAD_BYTES` | `10485760` | 10 MB. |
| `MEDIA_MALWARE_SCAN_ENABLED`, `MEDIA_MALWARE_SCAN_REQUIRED` | `false` | Production requires **both true** whenever uploads are enabled. |
| `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_TIMEOUT_SECONDS` | `clamav`, `3310`, `15` | The scanner. |

### Features

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKGROUND_JOBS_ENABLED` | `true` | Monthly-report notifications, automatic fee reminders, demo refresh. |
| `PUBLIC_DEMO_ENABLED` | `false` | Adds “Discover without an account” and keeps the demo school fresh. No platform admin is created in it. |
| `DEMO_SEED_ON_STARTUP`, `DEMO_SEED_RESET_ON_STARTUP` | `false` | Seed the demo school at start (development/staging; needs `DEMO_PASSWORD` unless the public demo is on). |
| `FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_FILE` or `FCM_SERVICE_ACCOUNT_JSON` | empty | Firebase push to phones. All empty = off. See [Operations](OPERATIONS.md#push-notifications-firebase). |
| `NTFY_BASE_URL`, `NTFY_AUTH_TOKEN`, `NTFY_TOPIC_PREFIX` | empty, empty, `educonnect` | Optional self-hosted push while the app is open. |

### Production checks (startup refuses otherwise)

HTTPS-only non-local CORS origins; `JWT_ALGORITHM=RS256`; `CREATE_TABLES_ON_STARTUP=false`;
`PLATFORM_SECRET` and `SERVER_FINGERPRINT_SALT` long and not placeholders; malware
scanning enabled and required when uploads are on; a valid `HEALTH_DATA_KEY`; the
previous public key different from the current one. `scripts/check_production_posture.py`
runs the same checks in CI.

### Docker deployment extras (`.env.production`)

`FQDN` (API domain), `WEB_FQDN` (web domain), `WEB_API_BASE_URL`, `ACME_EMAIL`
(Let's Encrypt), `POSTGRES_SUPERUSER*`, `APP_DB_USER`/`APP_DB_PASSWORD`, `REDIS_PASSWORD`,
and the backup settings `BACKUP_REMOTE_HOST`, `BACKUP_REMOTE_PATH`, `BACKUP_LOCAL_DIR`,
`BACKUP_RETENTION_DAYS`, `BACKUP_AGE_RECIPIENT`. See [`DEPLOIEMENT_VPS_LOCAL.md`](../DEPLOIEMENT_VPS_LOCAL.md).

## Web build (`edu_connect_web`)

| Variable | Meaning |
| --- | --- |
| `VITE_API_BASE_URL` | **Required** for production builds: the API origin, e.g. `https://api.votre-domaine.dz`. `npm run check:env` validates it. |
| `VITE_SALES_EMAIL` | Optional: adds a “Contact us” button to the public `/pricing` page. |

Variables are baked into the build; rebuild after changing them. Never put a
secret in a `VITE_` variable: the built files are scanned for secrets in CI.

## Mobile build (`edu_connect`)

Pass a JSON file with `flutter build … --dart-define-from-file=config/production.json`
(template: `config/production.example.json`, validated by `tool/validate_mobile_config.dart`).

| Key | Meaning |
| --- | --- |
| `APP_ENV` | `production` for releases. |
| `API_BASE_URL`, `WS_BASE_URL` | API and WebSocket origins (HTTPS / WSS). |
| `NTFY_BASE_URL`, `NTFY_WS_BASE_URL` | Optional ntfy transport; leave empty if unused. |
| `FIREBASE_API_KEY`, `FIREBASE_APP_ID_ANDROID`, `FIREBASE_APP_ID_IOS`, `FIREBASE_SENDER_ID`, `FIREBASE_PROJECT_ID` | Optional: all present = push when the app is closed. No `google-services.json` or `GoogleService-Info.plist` is needed. |

Build steps: [`ANDROID_BUILD_GUIDE.md`](../ANDROID_BUILD_GUIDE.md), [`IOS_BUILD_GUIDE.md`](../IOS_BUILD_GUIDE.md).

## Per-school settings

Stored in `schools.tenant_config` (JSON), changed in the product or by the platform
administrator:

| Key | Set by | Meaning |
| --- | --- | --- |
| `max_parents_per_student` | default 2 | Parents who can link to one student. |
| `fee_auto_reminders` | director (Fees tab) | Automatic fee reminders. |
| `mentions` | platform admin (database) | Thresholds for distinctions, e.g. `{"felicitations":15,"encouragements":13,"tableau_honneur":11}`; defaults 16 / 14 / 12. |
| `setup_dismissed` | director | Hides the setup checklist. |
