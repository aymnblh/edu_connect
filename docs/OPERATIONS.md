# Operations guide

How to put Wasel Edu online and keep it running. This page is the map and the
essential procedures; the step-by-step detail lives in:

- [`DEPLOIEMENT_VPS_LOCAL.md`](../DEPLOIEMENT_VPS_LOCAL.md) — renting and installing the server (French).
- [`OPERATIONS_RUNBOOK.md`](../OPERATIONS_RUNBOOK.md) — release gate, backups, restore drill, rollback, observability, incidents.
- [`PRODUCTION_READINESS_CHECKLIST.md`](../PRODUCTION_READINESS_CHECKLIST.md) and [`LAUNCH_EVIDENCE_COLLECTION_GUIDE.md`](../LAUNCH_EVIDENCE_COLLECTION_GUIDE.md) — launch gates and the proof to keep.

## 1. What runs where

One Linux server (Ubuntu 24.04 LTS, 4 vCPU, 8 GB RAM, 100+ GB SSD, fixed IPv4) in a
data centre **in Algeria** (the privacy policy says so) runs Docker Compose
(`edu_connect_backend/docker-compose.yml`): Caddy (HTTPS, also serves the web
build), the API, PostgreSQL 16, Redis, ClamAV. Only 80/443 are public.
Two names point to it: `app.<domain>` (web) and `api.<domain>` (API).

## 2. First deployment

```bash
git clone https://github.com/aymnblh/edu_connect.git && cd edu_connect/edu_connect_backend
python3 scripts/generate_production_env.py --output .env.production   # secrets + HEALTH_DATA_KEY
nano .env.production            # FQDN, WEB_FQDN, WEB_API_BASE_URL, CORS_ORIGINS, ACME_EMAIL, backup settings
install -d -m 700 secrets       # then create the RSA keys (see the VPS guide) and chown 10001:10001
chmod +x scripts/*.sh
./scripts/deploy.sh && ./scripts/verify_deployment.sh
docker compose --env-file .env.production exec api \
  python manage.py create-superadmin --email you@domain.dz --full-name "Platform admin"
```

Immediately after:
1. **Copy `HEALTH_DATA_KEY` off the server** (password manager). Without it health records cannot be read, even from a backup.
2. Sign in as the platform administrator, register a test school from the sign-up page, activate it (this starts its free trimester).
3. Run a backup and a **restore drill** (section 5) before real data goes in.

## 3. Day-to-day

| Task | How |
| --- | --- |
| Activate a new school | Platform admin → schools → *Activate* (free first trimester; referral reward applied automatically). |
| Record a subscription payment | Platform admin → school → add payment (months added). Do it **before** the trial/subscription ends: an expired school is blocked with HTTP 402. |
| Release an update | `git pull`, `./scripts/deploy.sh` (builds, migrates, restarts), then `./scripts/verify_deployment.sh`. Take a backup first. |
| See what happened | Director → Activity log (per school); server: `docker compose --env-file .env.production logs -f --tail=200 api caddy`. Search a report by its `X-Request-ID`. |
| Sign someone out | Director → team or parent → *Sign out* (all devices, immediately). |
| Reset a lost password | Director → *Reset access* → a new one-time code (72 h). |
| Customise report-card distinctions | Set `tenant_config.mentions` for the school in the database. |

## 4. Background jobs

Run inside the API process, safe with several instances (`BACKGROUND_JOBS_ENABLED`):
monthly-report notifications (1st of the month), automatic fee reminders (for schools
that enabled them), nightly demo rebuild (only with `PUBLIC_DEMO_ENABLED`). If a
notification seems missing, search the API log for `Background job … failed`.

## 5. Backups and restore

- Encrypted with `age` before leaving the server; the private key stays on the backup machine, never on the VPS.
- Script: `ENV_FILE=.env.production ./scripts/backup_educonnect.sh` (database dump, private files, JWT keys, environment). Schedule it every 6 hours; retention in `BACKUP_RETENTION_DAYS`.
- **Restore drill monthly** on staging with `scripts/restore_drill.sh` (it refuses production). Log each drill in [`RESTORE_DRILL_LOG.md`](../RESTORE_DRILL_LOG.md).
- A restored database needs the **same `HEALTH_DATA_KEY`** (or the old key in `HEALTH_DATA_PREVIOUS_KEYS`).
- Rollback of a bad release: [`OPERATIONS_RUNBOOK.md`](../OPERATIONS_RUNBOOK.md#rollback-strategy) — restore the previous image; migrations are written to be additive, so a rollback rarely needs a database downgrade.

## 6. Monitoring

Watch from an external service: `https://api.<domain>/health` (alive) and `/health/ready` (database and Redis reachable, 503 if not). Also: disk and RAM, container restarts, 5xx rate and latency, the age of the last backup and last restore drill, ClamAV health. Prometheus-format metrics are at `/metrics` (header `X-Platform-Secret`). Security alerts (bursts of 401/403/429) are written to the activity log and the application log.

## 7. Key and secret management

| Secret | Where | Rotation |
| --- | --- | --- |
| JWT RSA keys | `secrets/*.pem` | `scripts/rehearse_key_rotation.py` rehearses it: set the old public key as `PREVIOUS_PUBLIC_KEY_PATH`, deploy the new pair; old tokens expire naturally. |
| `HEALTH_DATA_KEY` | `.env.production` + off-server copy | Put the old key in `HEALTH_DATA_PREVIOUS_KEYS`, set a new one, restart; rows re-encrypt as they are saved. |
| `PLATFORM_SECRET`, `SERVER_FINGERPRINT_SALT` | `.env.production` | Change and restart (fingerprints reset; users stay signed in). |
| Database and Redis passwords | `.env.production` | Change in the environment and in the database, restart. |
| Firebase service account | file in `secrets/` | Generate a new key in the Firebase console, replace the file, restart; delete the old key there. |

## 8. Push notifications (Firebase)

Optional; off unless configured. Steps: create a Firebase project with an Android and an iOS app; download a **service-account** key and point `FCM_SERVICE_ACCOUNT_FILE` (and `FCM_PROJECT_ID`) at it on the server; put the five `FIREBASE_*` values in the mobile build file; for iPhone also upload an APNs key to Firebase and add the *Push Notifications* capability in Xcode (needs a Mac and an Apple developer account). Details in [`OPERATIONS_RUNBOOK.md`](../OPERATIONS_RUNBOOK.md). Test: sign in on a phone, close the app, record an absence or a payment for that child.

## 9. Incidents

1. **Contain**: sign out affected users, deactivate accounts, or set `is_active` false for a school (platform admin → *Suspend*). To stop everything, stop the `api` container.
2. **Preserve**: do not delete logs; export the activity log (CSV) and keep server logs and a backup.
3. **Communicate**: follow [`INCIDENT_RESPONSE_CONTACTS.md`](../INCIDENT_RESPONSE_CONTACTS.md); a personal-data breach has legal notification duties (Law 18-07) — involve your legal adviser early.
4. **Fix and review**: rotate whichever secrets may be exposed (section 7), then write down what happened and what changes.

## 10. Launch checklist (summary)

- [ ] Server in Algeria, HTTPS working, only 80/443 open, SSH by key only.
- [ ] `.env.production` generated, domains and CORS set, `HEALTH_DATA_KEY` backed up off-server.
- [ ] `alembic upgrade head` reaches `20261027_0026`; `verify_deployment.sh` passes.
- [ ] Backup runs automatically and a **restore drill** succeeded.
- [ ] Staging evidence recorded: migration on production-like data and live parity ([`STAGING_MIGRATION_EVIDENCE.md`](../STAGING_MIGRATION_EVIDENCE.md), [`STAGING_PARITY_EVIDENCE.md`](../STAGING_PARITY_EVIDENCE.md)).
- [ ] Legal review of the privacy policy, health and fee data, and the paper consent form signed off ([`LEGAL_REVIEW_SIGNOFF.md`](../LEGAL_REVIEW_SIGNOFF.md)).
- [ ] Printed documents checked on real paper (receipts, report cards, parent-code cards, monthly report).
- [ ] Mobile apps built against the production API (and Firebase values if used); iPhone build from a Mac.
- [ ] External uptime monitor on `/health/ready`.
- [ ] A pilot school onboarded with the setup checklist; its feedback reviewed.

`python scripts/production_launch_status.py --verify-local` prints which gates are still open.
