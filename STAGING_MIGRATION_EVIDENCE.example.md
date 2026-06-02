# EduConnect Staging Migration Evidence

Keep the completed `STAGING_MIGRATION_EVIDENCE.md` in the private operations vault or private deployment repo. Do not include production secrets or raw personal data.

## Required Fields

- Date/time UTC:
- Operator:
- Source backup timestamp:
- Source backup checksum:
- Staging database host:
- Staging app image/tag:
- Alembic revision before upgrade:
- Alembic revision after upgrade:
- `alembic heads` output:
- Migration command:
- Result: PASS / FAIL
- Duration:
- Data anonymization/legal basis:
- Findings and follow-up:

## Command Evidence

Paste the immutable job output or a link to the immutable job log for each
required command. Keep the labels below unchanged so the validator can verify
the evidence shape.

- alembic upgrade head:
- alembic current after:

## Required Commands

```bash
cd edu_connect_backend
python scripts/collect_staging_evidence.py \
  --production-env .env.production \
  --staging-env .env.staging \
  --staging-api-url https://staging-api.example.com \
  --source-backup-timestamp 2026-05-21T000000Z \
  --source-backup-checksum SHA256_FROM_BACKUP_MANIFEST
```

After migration, run the staging parity and RLS checks listed in `STAGING_PARITY_EVIDENCE.example.md`.
