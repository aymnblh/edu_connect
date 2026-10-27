# Wasel Edu — documentation

Wasel Edu (code name *EduConnect*) is a school management platform for private
schools in Algeria. It connects the school administration, teachers and parents
on the web and on phones, in Arabic, French and English.

## Where to start

| You are… | Read |
| --- | --- |
| Evaluating the product, or training a school | [Product guide](PRODUCT.md), then the French user guide [`GUIDE_UTILISATEUR.md`](../GUIDE_UTILISATEUR.md) |
| A developer joining the project | [Development guide](DEVELOPMENT.md), then [Architecture](ARCHITECTURE.md) |
| Integrating with or testing the API | [API reference](API_REFERENCE.md) and [Data model](DATA_MODEL.md) |
| Putting it online | [Operations guide](OPERATIONS.md), then [`DEPLOIEMENT_VPS_LOCAL.md`](../DEPLOIEMENT_VPS_LOCAL.md) |
| Reviewing security, privacy or legal exposure | [Security and privacy](SECURITY.md) and [`SECURITY_PRIVACY_POLICY.md`](../SECURITY_PRIVACY_POLICY.md) |
| Configuring a server or a build | [Configuration reference](CONFIGURATION.md) |

## The documents

- [PRODUCT.md](PRODUCT.md) — roles, features, and the business rules behind them.
- [ARCHITECTURE.md](ARCHITECTURE.md) — components, how a request flows, multi-tenancy, background jobs, real time and push.
- [DATA_MODEL.md](DATA_MODEL.md) — every table, grouped by domain, and the migration history.
- [API_REFERENCE.md](API_REFERENCE.md) — every endpoint (generated from the code).
- [SECURITY.md](SECURITY.md) — authentication, authorisation, tenant isolation, sensitive data, audit, abuse limits.
- [CONFIGURATION.md](CONFIGURATION.md) — server settings, web and mobile build settings.
- [DEVELOPMENT.md](DEVELOPMENT.md) — running locally, tests, CI, migrations, conventions, recipes.
- [OPERATIONS.md](OPERATIONS.md) — deploying, background jobs, backups, monitoring, incidents, launch checklist.

Older, task-specific documents stay at the repository root (deployment,
Android and iOS builds, launch evidence, runbook, legal sign-off). This folder
is the entry point that ties them together.

## Repository layout

```text
edu_connect_backend/   FastAPI server, PostgreSQL migrations, ops scripts, tests
edu_connect_web/       React web app (administration, teachers, parents, infirmary)
edu_connect/           Flutter mobile app (Android and iOS)
docs/                  this documentation
scripts/               release manifest and gate runners
.github/workflows/     continuous integration
```

## Keeping the documentation true

- `API_REFERENCE.md` is generated: `cd edu_connect_backend && APP_ENV=test python scripts/generate_api_docs.py`. Regenerate it when routes change.
- Settings are defined in `edu_connect_backend/app/core/config.py`; update [CONFIGURATION.md](CONFIGURATION.md) when one is added.
- The French user guide (`GUIDE_UTILISATEUR.md`) is written for school staff; keep product behaviour changes in both it and [PRODUCT.md](PRODUCT.md).
