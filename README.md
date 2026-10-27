# Wasel Edu

A school management platform for private schools in Algeria: administration,
teachers and parents connected on the web and on phones, in Arabic, French and
English. Grades and report cards, attendance, homework, messaging, announcements,
parent–teacher meetings, school fees and receipts, health sheets and an
infirmary workspace, a monthly report for the director, and a public demo.

| Part | Folder | Stack |
| --- | --- | --- |
| API | [`edu_connect_backend`](edu_connect_backend) | FastAPI, PostgreSQL (row-level security), Redis |
| Web | [`edu_connect_web`](edu_connect_web) | React, TypeScript, Vite |
| Mobile | [`edu_connect`](edu_connect) | Flutter (Android, iOS) |

## Documentation

Start at **[docs/README.md](docs/README.md)**:
[product guide](docs/PRODUCT.md) ·
[architecture](docs/ARCHITECTURE.md) ·
[data model](docs/DATA_MODEL.md) ·
[API reference](docs/API_REFERENCE.md) ·
[security and privacy](docs/SECURITY.md) ·
[configuration](docs/CONFIGURATION.md) ·
[development](docs/DEVELOPMENT.md) ·
[operations](docs/OPERATIONS.md)

For school staff there is a French user guide: [`GUIDE_UTILISATEUR.md`](GUIDE_UTILISATEUR.md).

## Quick start (development)

```bash
cd edu_connect_backend
pip install -r requirements-dev.txt
cp .env.example .env.local && python manage.py generate-keys
docker compose -f docker-compose.local.yml up -d db redis
alembic upgrade head && uvicorn app.main:app --reload     # API on :8000

cd ../edu_connect_web && npm ci && VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

Full instructions, tests and conventions: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
