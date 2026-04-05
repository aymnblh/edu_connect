from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from .config import settings
from .context import tenant_id_context

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    """
    Generate a database session with Postgres RLS context correctly set.
    """
    school_id = tenant_id_context.get()
    
    async with AsyncSessionLocal() as session:
        # 1. Start a transaction and set the tenant context
        # SET LOCAL ensures the setting only lasts for the current transaction
        if school_id:
            await session.execute(text(f"SET LOCAL app.current_school_id = '{school_id}'"))
        
        try:
            yield session
        finally:
            # 2. Strict RESET ALL before returning the connection to the pool
            # This prevents tenant 'leakage' if the session is reused
            await session.execute(text("RESET ALL"))
            await session.close()
