from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from redis.asyncio import Redis
from sqlalchemy import text
from app.db.database import engine, Base
from app.api.router import api_router
from app.core.config import settings
from app.core.middleware import TenantMiddleware, AuditMiddleware, SchoolActivationMiddleware
from app.core.observability import ObservabilityMiddleware, metrics
from app.ws_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.is_production and settings.create_tables_on_startup:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    await manager.startup()
    try:
        yield
    finally:
        await manager.shutdown()


app = FastAPI(
    title="Wasel Edu API",
    description="Private backend for Wasel Edu - Local JWT Auth + PostgreSQL data",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(AuditMiddleware)
app.add_middleware(SchoolActivationMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ObservabilityMiddleware)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}


def _db_pool_snapshot() -> dict[str, int | None]:
    pool = engine.sync_engine.pool
    snapshot: dict[str, int | None] = {}
    for attr in ("size", "checkedin", "checkedout", "overflow"):
        value = getattr(pool, attr, None)
        if value is None:
            snapshot[attr] = None
            continue
        try:
            snapshot[attr] = int(value() if callable(value) else value)
        except Exception:
            snapshot[attr] = None
    return snapshot


@app.get("/health/ready", tags=["Health"])
async def readiness():
    checks: dict[str, str] = {}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    redis_client = Redis.from_url(
        settings.redis_url,
        socket_connect_timeout=1,
        socket_timeout=1,
        decode_responses=True,
    )
    try:
        await redis_client.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"
    finally:
        await redis_client.aclose()

    status_code = 200 if all(value == "ok" for value in checks.values()) else 503
    return JSONResponse(
        {
            "status": "ready" if status_code == 200 else "degraded",
            "checks": checks,
            "db_pool": _db_pool_snapshot(),
        },
        status_code=status_code,
    )


@app.get("/metrics", tags=["Operations"], response_class=PlainTextResponse)
async def prometheus_metrics(x_platform_secret: str = Header("", alias="X-Platform-Secret")):
    if x_platform_secret != settings.platform_secret:
        raise HTTPException(status_code=403, detail="Invalid platform secret")
    return PlainTextResponse(metrics.render_prometheus(db_pool=_db_pool_snapshot()))
