# EduConnect Launch Evidence Collection Guide

This guide explains how to produce the four private evidence files required by
`edu_connect_backend/scripts/validate_launch_evidence.py`.

Do not invent values to make validation pass. These files are release signoffs
and should contain real command output, real people, and real review decisions.

## Required Files

The validator expects these files in `D:\Aymen\edu`:

- `STAGING_MIGRATION_EVIDENCE.md`
- `STAGING_PARITY_EVIDENCE.md`
- `LEGAL_REVIEW_SIGNOFF.md`
- `INCIDENT_RESPONSE_CONTACTS.md`

Example formats already exist beside this guide:

- `STAGING_MIGRATION_EVIDENCE.example.md`
- `STAGING_PARITY_EVIDENCE.example.md`
- `LEGAL_REVIEW_SIGNOFF.example.md`
- `INCIDENT_RESPONSE_CONTACTS.example.md`

To create private working drafts from those examples, run the initializer first
as a dry run:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\init_launch_evidence_drafts.py --evidence-root ..
```

If the dry run looks correct, create the missing drafts:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\init_launch_evidence_drafts.py --evidence-root .. --write
```

The initializer does not overwrite existing evidence files unless you pass
`--overwrite`. Drafts copied from examples are still blocked by validation until
real command output, named contacts, and legal sign-off details are filled in.

## 1. Generate Staging Technical Evidence

Before collecting staging evidence, replace production/staging placeholder
secrets with strong environment-specific values.

Generate a local production env candidate:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\generate_production_env.py --output .env.production.generated --overwrite
python scripts\check_production_posture.py --actual-env .env.production.generated
```

If the generated file passes validation, review the domain, backup, provider,
and deployment-specific values. Then promote it deliberately:

```powershell
cd D:\Aymen\edu\edu_connect_backend
Copy-Item .env.production.generated .env.production
python scripts\check_production_posture.py
```

Do not reuse production generated values for staging. Staging must have its own
database URL, platform secret, fingerprint salt, ntfy token, topic prefix, FQDN,
and CORS origins.

Generate and validate a staging env candidate:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\generate_production_env.py `
  --template .env.staging.example `
  --output .env.staging.generated `
  --overwrite

python scripts\check_staging_parity.py `
  --production-env .env.production.generated `
  --staging-env .env.staging.generated
```

Review both generated files without printing secret values:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\review_env_readiness.py `
  --production-env .env.production.generated `
  --staging-env .env.staging.generated
```

Run the cross-project preflight gates against generated env candidates:

```powershell
cd D:\Aymen\edu
python scripts\run_release_gates.py `
  --allow-blockers `
  --use-generated-envs `
  --web-api-base-url https://api.educonnect.dz
```

You can also ask the backend launch-status report to include generated-env
checks directly:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\production_launch_status.py `
  --verify-local `
  --use-generated-envs `
  --allow-blockers
```

After review, promote it deliberately:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\promote_generated_envs.py
python scripts\promote_generated_envs.py --apply
```

Run this from PowerShell after the staging environment is deployed and reachable.

```powershell
cd D:\Aymen\edu\edu_connect_backend

python scripts\collect_staging_evidence.py `
  --production-env .env.production `
  --staging-env .env.staging `
  --staging-api-url https://staging-api.example.com `
  --staging-web-url https://staging-app.example.com `
  --source-backup-timestamp 2026-05-24T000000Z `
  --source-backup-checksum SHA256_FROM_BACKUP_MANIFEST `
  --app-image-tag IMAGE_TAG_DEPLOYED_TO_STAGING
```

This command writes:

- `D:\Aymen\edu\STAGING_MIGRATION_EVIDENCE.md`
- `D:\Aymen\edu\STAGING_PARITY_EVIDENCE.md`

The collector checks that staging does not point at the production database,
runs Alembic migration checks, checks staging health/readiness, runs the staging
parity config check, and runs PostgreSQL RLS integration tests.

Required environment inputs:

- `.env.production` with `APP_ENV=production`
- `.env.staging` with `APP_ENV=staging`
- staging `DATABASE_URL` different from production
- `STAGING_ADMIN_DATABASE_URL` environment variable, or pass `--test-database-url`

Dry run:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\collect_staging_evidence.py --dry-run
```

## 2. Complete Legal Review Signoff

Create `D:\Aymen\edu\LEGAL_REVIEW_SIGNOFF.md` from the example only after a
real reviewer approves the launch.

The validator requires:

- Reviewer name, role, organization, jurisdictions, notice version, and next review date
- Every required privacy/legal field set to `YES`
- `Result: APPROVED`
- `Conditions before launch: none`, `n/a`, or `no open conditions`

If the result is conditional or not approved, keep the file accurate and do not
launch.

## 3. Complete Incident Response Contacts

Create `D:\Aymen\edu\INCIDENT_RESPONSE_CONTACTS.md` from the example with real
named contacts.

The validator requires rows for:

- Incident commander
- Backend owner
- Database owner
- Infrastructure owner
- School/customer contact
- Legal/privacy contact

Each row must include:

- Name
- Primary contact
- Backup contact
- Availability

The file must also include escalation paths for `SEV1`, `SEV2`, and `SEV3`.

## 4. Validate Before Launch

Run:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\validate_launch_evidence.py --evidence-root ..
```

Launch remains blocked until all four checks show `[PASS]`.

For a non-blocking status report during preparation:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\validate_launch_evidence.py --evidence-root .. --allow-missing
```
