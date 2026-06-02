# EduConnect Operations Runbook

This runbook is the minimum production operating procedure for EduConnect. It is written for a self-hosted Docker deployment with PostgreSQL, Redis-compatible services where configured, Traefik, ntfy, ClamAV, private media storage, and the FastAPI backend.

## Release Gate

Run these before promoting any build to production:

```bash
python scripts/run_release_gates.py --web-api-base-url https://api.educonnect.dz
python scripts/generate_release_manifest.py --web-api-base-url https://api.educonnect.dz
```

For a status snapshot before the four external evidence files are complete, use `--allow-blockers`. The expanded command list below mirrors what the wrapper runs.
Store the generated `RELEASE_MANIFEST.md` with the release record; it contains hashes, not secrets.

```bash
cd edu_connect_backend
python -m compileall app alembic tests scripts
python scripts/check_production_posture.py
python scripts/check_staging_parity.py --production-env .env.production --staging-env .env.staging
python scripts/check_alembic_release.py --sql-output /tmp/educonnect-alembic-upgrade.sql
python scripts/rehearse_key_rotation.py
python -m pytest -q
docker compose --env-file .env.production.example -f docker-compose.yml config --quiet

cd ../edu_connect_web
npm ci
export VITE_API_BASE_URL=https://api.educonnect.dz
npm run lint
npm run test:workspace
npm run test:env
npm run check:env
npm run test:secret-scanner
npm run build
npm run test:secrets
npm run test:preview

cd ../edu_connect
flutter pub get
flutter analyze
```

CI runs the same core checks in `.github/workflows/production-readiness.yml`, including PostgreSQL RLS integration tests with `RUN_DB_TESTS=1`.

Before launch, generate the current go/no-go report:

```bash
cd edu_connect_backend
python scripts/validate_launch_evidence.py --evidence-root ..
python scripts/production_launch_status.py --verify-local
```

The evidence validator exits non-zero until the private staging, legal, and incident-response evidence files are complete. The launch report exits non-zero while any checklist item remains unchecked. Use `--allow-blockers` only for dashboards or documentation snapshots.

## Backup Policy

Back up these assets together so database rows, private media, and signing material remain consistent:

- PostgreSQL database: `pgdata`
- Private uploaded files: `private_media`
- RSA signing keys: `edu_connect_backend/secrets`
- Traefik certificate state: `letsencrypt`
- ntfy data: `ntfy_data`, if push topics must survive rebuilds
- Production env file: `.env.production`, stored in the secrets manager or backup vault, not in git

JWT key rotation rehearsal:

```bash
cd edu_connect_backend
python scripts/rehearse_key_rotation.py
```

For a real rotation, generate a new key pair, move the old public key to `PREVIOUS_PUBLIC_KEY_PATH`, deploy both public keys plus the new private key, wait at least the maximum access-token lifetime, then remove `PREVIOUS_PUBLIC_KEY_PATH` in a second deploy. Never delete the old public key before all old access tokens have expired.

Recommended minimum schedule:

- Full logical PostgreSQL dump: every 6 hours
- Private media sync: every 6 hours, after the database dump
- Secrets/config backup: after every rotation or production env change
- Retention: 35 daily restore points, 12 monthly restore points, adjusted to the school's legal retention policy
- Encryption: backups encrypted before leaving the production host

Example database backup:

```bash
cd edu_connect_backend
ENV_FILE=.env.production ./scripts/backup_educonnect.sh
```

Validate backup and restore script guardrails in CI:

```bash
cd edu_connect_backend
python -m pytest -q tests/test_ops_readiness.py
```

Example private media backup:

```bash
rsync -a --delete edu_connect_backend/private_media/ "$BACKUP_REMOTE_HOST:$BACKUP_REMOTE_PATH/private_media/"
```

## Restore Drill

Perform a restore drill at least monthly and after any migration that changes student, grade, attendance, media, auth, or audit tables.

1. Provision a staging host or clean local Docker volume.
2. Copy `.env.staging.example` to `.env.staging`, fill staging-only secrets, and verify `APP_ENV=staging`.
3. Restore the latest backup archive:

```bash
cd edu_connect_backend
STAGING_ENV_FILE=.env.staging BACKUP_ARCHIVE=./backups/educonnect-YYYYMMDDTHHMMSSZ.tar.gz ./scripts/restore_drill.sh
```

4. Verify:

```bash
curl -fsS https://staging-api.example.com/health
curl -fsS https://staging-api.example.com/health/ready
RUN_DB_TESTS=1 TEST_DATABASE_URL="$STAGING_ADMIN_DATABASE_URL" python -m pytest -q tests/test_postgres_rls_integration.py
```

Record the restore duration, operator, backup timestamp, and any data loss window. The target recovery objectives are RPO <= 6 hours and RTO <= 2 hours unless a school contract is stricter.

Keep restore evidence in `RESTORE_DRILL_LOG.md` or a private operations system with the same fields. The minimum evidence is:

- Backup archive timestamp and checksum.
- Restore start/finish timestamps and operator.
- `alembic current` and `alembic heads` after restore.
- `/health` and `/health/ready` results.
- `RUN_DB_TESTS=1` RLS integration test result.
- Confirmation that private media files are restored and still require authorized download.

## Rollback Strategy

Application rollback:

1. Keep the previous container image tag available.
2. If the new API fails after deploy, scale or restart the API with the previous tag.
3. Keep the database at the migrated version unless the migration has a tested downgrade and no new writes depend on it.
4. If the migration itself failed before app traffic resumed, restore the pre-deploy database snapshot rather than hand-editing production data.

Migration rollback:

- Prefer forward fixes for data-preserving migrations.
- Use Alembic downgrade only on staging first.
- For RLS policy regressions, deploy a forward migration that restores the last known-good policy.
- For destructive migrations, rollback requires restoring the database and private media backup captured immediately before deployment.

## Observability

Health endpoints:

- `/health`: process is alive.
- `/health/ready`: database and Redis-style dependency readiness, plus DB pool snapshot.
- `/metrics`: Prometheus-style metrics, protected by `X-Platform-Secret`.

Monitor at minimum:

- API 5xx rate and latency from `/metrics`
- Database pool checked-out connections and overflow from `/metrics`
- Repeated `401`, `403`, and `429` spikes through `security.response_spike` audit events and critical admin notifications
- Failed login and refresh-token reuse audit actions
- Failed audit writes, Redis/rate-limit warnings, WebSocket Redis publish failures, ntfy push errors, and ClamAV scanner failures from application logs
- Migration failures and container restart loops from deployment logs

Suggested alert thresholds:

- 5xx rate above 1 percent for 5 minutes
- p95 API latency above 2 seconds for 10 minutes
- DB pool checked-out connections above 80 percent for 5 minutes
- Any refresh-token reuse event
- Any ClamAV unavailable event when `MEDIA_MALWARE_SCAN_REQUIRED=true`

## Incident Response

Severity levels:

- SEV1: confirmed cross-tenant data exposure, compromised signing keys, database corruption, production outage.
- SEV2: degraded messaging/files/auth, repeated suspicious login spikes, failed backup/restore drill.
- SEV3: isolated user issue, non-sensitive background job failure, minor deployment regression.

Immediate actions for suspected data exposure:

1. Freeze deploys except emergency fixes.
2. Preserve audit logs and database snapshots.
3. Disable affected endpoint or route at Traefik/API level.
4. Rotate platform secret, JWT keys, and affected user sessions if auth is involved.
5. Export relevant audit events from `/security/audit-events`.
6. Notify school owner and legal/privacy contact according to the applicable contract and law.
7. Document timeline, affected tenants/users, root cause, fix, and prevention.

Contact placeholders:

- Incident commander.
- Backend owner.
- Database owner.
- Infrastructure/VPS owner.
- School/customer contact.
- Legal/privacy contact.

Maintain the filled roster in the private operations vault using `INCIDENT_RESPONSE_CONTACTS.example.md` as the required structure. The completed roster must include primary and backup contacts, escalation deadlines, and external dependency support channels.

## Staging Parity

Staging must mirror production for:

- PostgreSQL version and app role with `NOBYPASSRLS`
- RLS migrations and seed shape
- Redis/rate-limit behavior
- ClamAV malware scanning mode
- Private media storage path and signed/authorized download flow
- JWT RS256 keys, using staging-only keys
- CORS origins and `APP_ENV=production`-like behavior where safe
- ntfy integration, using staging-only topics

Never run staging with production secrets or production user data unless the data has been anonymized and the legal basis is documented.

Validate parity before every launch candidate:

```bash
cd edu_connect_backend
python scripts/collect_staging_evidence.py \
  --production-env .env.production \
  --staging-env .env.staging \
  --staging-api-url https://staging-api.example.com \
  --staging-web-url https://staging-app.example.com \
  --source-backup-timestamp 2026-05-21T000000Z \
  --source-backup-checksum SHA256_FROM_BACKUP_MANIFEST
```

Record evidence using:

- `STAGING_MIGRATION_EVIDENCE.example.md`
- `STAGING_PARITY_EVIDENCE.example.md`
- `LEGAL_REVIEW_SIGNOFF.example.md`
- `INCIDENT_RESPONSE_CONTACTS.example.md`

The completed evidence files contain private operational or legal details and should live in the private operations vault or private deployment repo.

Validate completed evidence before marking the external checklist gates complete:

```bash
cd edu_connect_backend
python scripts/validate_launch_evidence.py --evidence-root ..
python scripts/production_launch_status.py --verify-local
```
