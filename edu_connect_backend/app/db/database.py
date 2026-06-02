from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings
from app.core.context import system_admin_context, tenant_id_context
from app.core.rls import set_request_rls_context

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    """
    Generate a database session with Postgres RLS context correctly set.
    """
    school_id = tenant_id_context.get()
    is_system_admin = system_admin_context.get()
    
    async with AsyncSessionLocal() as session:
        # 1. Start a transaction and set the tenant context
        # SET LOCAL ensures the setting only lasts for the current transaction
        if school_id or is_system_admin:
            await set_request_rls_context(
                session,
                school_id=school_id,
                is_system_admin=is_system_admin,
            )
        
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            # 2. Strict RESET ALL before returning the connection to the pool.
            # Rollback first so RESET ALL does not run inside an aborted transaction.
            if session.in_transaction():
                await session.rollback()
            await session.execute(text("RESET ALL"))
            await session.close()
