"""Periodic jobs started with the API (each one is safe to run from several workers)."""
import asyncio
import logging
from collections.abc import Awaitable, Callable

from app.core.config import settings

logger = logging.getLogger(__name__)


async def run_every(
    seconds: float,
    job: Callable[[], Awaitable[object]],
    name: str,
    *,
    retry_seconds: float | None = None,
) -> None:
    while True:
        failed = False
        try:
            await job()
        except asyncio.CancelledError:
            raise
        except Exception:
            failed = True
            logger.exception("Background job %s failed", name)
        delay = retry_seconds if failed and retry_seconds is not None else seconds
        await asyncio.sleep(delay)


def start_background_jobs() -> list[asyncio.Task]:
    if settings.app_env.lower() in {"test", "testing"} or not settings.background_jobs_enabled:
        return []
    from app.modules.demo.refresh import refresh_demo_if_stale
    from app.modules.finance.fees import send_automatic_reminders
    from app.modules.reports.monthly import notify_monthly_reports

    tasks = [
        asyncio.create_task(run_every(3600, notify_monthly_reports, "monthly_reports")),
        asyncio.create_task(run_every(3600, send_automatic_reminders, "fee_reminders")),
    ]
    if settings.public_demo_enabled:
        tasks.append(
            asyncio.create_task(
                run_every(1800, refresh_demo_if_stale, "demo_refresh", retry_seconds=30)
            )
        )
    return tasks


async def stop_background_jobs(tasks: list[asyncio.Task]) -> None:
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
