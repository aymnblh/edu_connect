from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, users, classes, chat, grades, homework, attendance, remarks, notifications, admin, verification, onboarding, platform
from .middleware import TenantMiddleware, AuditMiddleware, SchoolActivationMiddleware

app = FastAPI(
    title="EduConnect API",
    description="Private backend for EduConnect — Local JWT Auth + PostgreSQL data",
    version="1.0.0",
)

app.add_middleware(AuditMiddleware)
app.add_middleware(SchoolActivationMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your VPS domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Create tables if they don't exist (use Alembic for migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(classes.router)
app.include_router(chat.router)
app.include_router(grades.router)
app.include_router(homework.router)
app.include_router(attendance.router)

app.include_router(remarks.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(verification.router)
app.include_router(onboarding.router)
app.include_router(platform.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
