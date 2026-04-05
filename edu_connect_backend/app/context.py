from contextvars import ContextVar

tenant_id_context: ContextVar[str | None] = ContextVar("tenant_id_context", default=None)
