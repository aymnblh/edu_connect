import time
from collections import defaultdict, deque
import logging

from fastapi import HTTPException
import redis.asyncio as redis

from app.core.config import settings

_buckets: dict[str, deque[float]] = defaultdict(deque)
_redis_client: redis.Redis | None = None
_redis_failed_at: float | None = None
_redis_retry_after_seconds = 30.0

logger = logging.getLogger(__name__)


def _memory_rate_limit(key: str, *, limit: int, window_seconds: int) -> None:
    namespaced_key = f"{key}:{window_seconds}"
    now = time.monotonic()
    bucket = _buckets[namespaced_key]
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()

    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")

    bucket.append(now)


def _redis_key(key: str, window_seconds: int) -> str:
    return f"educonnect:rate_limit:{window_seconds}:{key}"


def _redis_available_for_attempt() -> bool:
    if _redis_failed_at is None:
        return True
    return (time.monotonic() - _redis_failed_at) >= _redis_retry_after_seconds


def _get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


async def check_rate_limit(key: str, *, limit: int, window_seconds: int) -> None:
    if limit <= 0:
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")

    if window_seconds <= 0:
        raise ValueError("window_seconds must be positive")

    if settings.app_env.lower() in {"test", "testing"}:
        _memory_rate_limit(key, limit=limit, window_seconds=window_seconds)
        return

    global _redis_failed_at
    if _redis_available_for_attempt():
        try:
            client = _get_redis_client()
            redis_key = _redis_key(key, window_seconds)
            count = await client.incr(redis_key)
            if count == 1:
                await client.expire(redis_key, window_seconds)
            if count > limit:
                raise HTTPException(status_code=429, detail="Rate limit exceeded.")
            _redis_failed_at = None
            return
        except HTTPException:
            raise
        except Exception as exc:
            _redis_failed_at = time.monotonic()
            logger.warning("Redis rate limiter unavailable: %s", exc)

    if settings.is_production:
        raise HTTPException(status_code=503, detail="Rate limiter unavailable.")

    _memory_rate_limit(key, limit=limit, window_seconds=window_seconds)
