# EduConnect Staging Parity Evidence

Keep the completed `STAGING_PARITY_EVIDENCE.md` in the private operations vault or private deployment repo. Do not commit staging secrets.

## Required Fields

- Date/time UTC:
- Operator:
- Staging API URL:
- Staging web URL:
- Staging database version:
- Staging app database role includes `NOBYPASSRLS`: YES / NO
- Staging uses RS256 keys distinct from production: YES / NO
- Staging Redis/rate-limit behavior verified: YES / NO
- Staging ClamAV mode matches production: YES / NO
- Staging private media authorization verified: YES / NO
- Staging ntfy topics are staging-only: YES / NO
- Result: PASS / FAIL
- Findings and follow-up:

## Command Evidence

Paste the immutable job output or a link to the immutable job log for each
required command. Keep the labels below unchanged so the validator can verify
the evidence shape.

- staging parity config check:
- staging health:
- staging readiness:
- staging PostgreSQL RLS integration tests:

## Required Commands

```bash
cd edu_connect_backend
python scripts/collect_staging_evidence.py \
  --production-env .env.production \
  --staging-env .env.staging \
  --staging-api-url https://staging-api.example.com \
  --staging-web-url https://staging-app.example.com
```

Attach the command output or a link to immutable CI/job logs.
