# Hosted Production Checks

Use this checklist after each Render/Vercel deployment.

## Current Hosted Mode

The Render blueprint now runs the API with:

```text
APP_ENV=production
CREATE_TABLES_ON_STARTUP=false
DEMO_SEED_ON_STARTUP=false
DEMO_SEED_RESET_ON_STARTUP=false
```

The Docker start script runs:

```bash
alembic upgrade head
uvicorn app.main:app
```

This means migrations are applied during deploy startup, without needing Render Shell.

## File Upload Policy

For the free hosted pilot, file uploads are disabled:

```text
MEDIA_UPLOADS_ENABLED=false
MEDIA_MALWARE_SCAN_ENABLED=false
MEDIA_MALWARE_SCAN_REQUIRED=false
```

This is intentional: production mode must not accept unscanned files. When you add a ClamAV-compatible private scanner, switch to:

```text
MEDIA_UPLOADS_ENABLED=true
MEDIA_MALWARE_SCAN_ENABLED=true
MEDIA_MALWARE_SCAN_REQUIRED=true
CLAMAV_HOST=<private-clamav-host>
CLAMAV_PORT=3310
```

## Render Variables To Confirm

In Render `educonnect-api`:

```text
APP_ENV=production
CORS_ORIGINS=https://<your-vercel-domain>
CREATE_TABLES_ON_STARTUP=false
DEMO_SEED_ON_STARTUP=false
DEMO_SEED_RESET_ON_STARTUP=false
MEDIA_UPLOADS_ENABLED=false
PRIVATE_KEY=<full private key>
PUBLIC_KEY=<full public key>
```

## Vercel Variables To Confirm

In Vercel:

```text
VITE_API_BASE_URL=https://<your-render-api>.onrender.com
```

Redeploy Vercel after changing this value.

## Verify Hosted Deployment

From your machine:

```powershell
cd D:\Aymen\edu\edu_connect_backend
python scripts\verify_hosted_deployment.py `
  --api-url https://educonnect-api-xx60.onrender.com `
  --web-url https://edu-connect-nu-rust.vercel.app `
  --expect-environment production
```

The script checks:

- API `/health`
- API `/health/ready`
- database and Redis readiness
- OpenAPI required routes
- CORS from the Vercel origin
- web `/login`, `/activate`, and `/policies`

If all checks pass, the hosted pilot is technically coherent.

## Remaining Manual Evidence

Keep evidence for:

- Render deploy logs showing `alembic upgrade head` succeeded
- successful output from `verify_hosted_deployment.py`
- backup/restore drill for the production database
- final CORS domain list
- no demo seed enabled after initial test data creation
