# edu_connect_backend

## Stack
- **FastAPI** (Python 3.12)
- **PostgreSQL 16** (via asyncpg + SQLAlchemy 2.0 async)
- **WebSockets** for real-time chat
- **Firebase Admin SDK** — only for token verification (Auth stays on Firebase)
- **Docker + Docker Compose** — ready to deploy on any VPS

---

## Project Structure

```
edu_connect_backend/
├── app/
│   ├── main.py           # FastAPI app + routers
│   ├── config.py         # Settings (env vars)
│   ├── database.py       # Async SQLAlchemy engine
│   ├── models.py         # ORM models (ALL tables)
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── auth.py           # Firebase JWT middleware
│   ├── ws_manager.py     # WebSocket connection manager
│   └── routers/
│       ├── users.py
│       ├── classes.py
│       ├── chat.py       # REST history + WebSocket
│       ├── grades.py
│       ├── homework.py
│       ├── attendance.py
│       ├── payments.py
│       └── remarks.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Quick Start (VPS)

### 1. Clone & configure
```bash
git clone <your-repo>
cd edu_connect_backend
cp .env.example .env
# Edit .env with your database URL and add your Firebase credentials
```

### 2. Add Firebase credentials
Download your Firebase **Service Account JSON** from Firebase Console:
> Project Settings → Service Accounts → Generate New Private Key

Save it as `firebase-credentials.json` in the project root (**never commit this file!**).

### 3. Deploy with Docker
```bash
docker compose up -d --build
```

The API will be available at `http://YOUR_SERVER_IP:8000`
Interactive docs at `http://YOUR_SERVER_IP:8000/docs`

---

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/` | Register user profile (after Firebase signup) |
| GET | `/users/me` | Get own profile |
| POST | `/classes/` | Create class (teacher) |
| POST | `/classes/join` | Join class by code (parent) |
| GET | `/classes/{id}/messages` | Chat history |
| WS | `/classes/{id}/ws` | Real-time WebSocket chat |
| POST | `/classes/{id}/grades/` | Add grade |
| POST | `/classes/{id}/homework/` | Add homework |
| POST | `/classes/{id}/attendance/` | Mark attendance |
| PATCH | `/classes/{id}/attendance/{att_id}/justify` | Parent justify absence |
| POST | `/classes/{id}/payments/` | Add payment |
| POST | `/classes/{id}/remarks/` | Add remark |

## Authentication Flow

```
Flutter App                Firebase                  EduConnect API
    │                          │                          │
    │──── login(email,pass) ──▶│                          │
    │◀──── idToken ────────────│                          │
    │                          │                          │
    │──── GET /users/me ──────────────────────────────────▶│
    │     Authorization: Bearer <idToken>                  │
    │                          │───verify_id_token()──▶   │
    │                          │◀── uid ───────────────   │
    │◀──── UserProfile ───────────────────────────────────│
```
