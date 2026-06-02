import threading
import time
from collections import defaultdict
from collections.abc import Mapping

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


def _label(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


class InMemoryMetrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._request_total: dict[tuple[str, str, str], int] = defaultdict(int)
        self._error_total: dict[tuple[str, str], int] = defaultdict(int)
        self._duration_sum: dict[tuple[str, str], float] = defaultdict(float)
        self._duration_count: dict[tuple[str, str], int] = defaultdict(int)

    def record(self, *, method: str, route: str, status_code: int, duration_seconds: float) -> None:
        status_class = f"{status_code // 100}xx"
        key = (method, route, status_class)
        route_key = (method, route)
        with self._lock:
            self._request_total[key] += 1
            self._duration_sum[route_key] += duration_seconds
            self._duration_count[route_key] += 1
            if status_code >= 500:
                self._error_total[route_key] += 1

    def render_prometheus(self, *, db_pool: Mapping[str, int | None] | None = None) -> str:
        lines = [
            "# HELP educonnect_http_requests_total Total API requests by method, route, and status class.",
            "# TYPE educonnect_http_requests_total counter",
        ]
        with self._lock:
            request_items = sorted(self._request_total.items())
            duration_sum_items = sorted(self._duration_sum.items())
            duration_count_items = sorted(self._duration_count.items())
            error_items = sorted(self._error_total.items())

        for (method, route, status_class), value in request_items:
            lines.append(
                f'educonnect_http_requests_total{{method="{_label(method)}",route="{_label(route)}",status_class="{status_class}"}} {value}'
            )

        lines.extend(
            [
                "# HELP educonnect_http_request_duration_seconds_sum Total request duration in seconds.",
                "# TYPE educonnect_http_request_duration_seconds_sum counter",
            ]
        )
        for (method, route), value in duration_sum_items:
            lines.append(
                f'educonnect_http_request_duration_seconds_sum{{method="{_label(method)}",route="{_label(route)}"}} {value:.6f}'
            )

        lines.extend(
            [
                "# HELP educonnect_http_request_duration_seconds_count Count of observed request durations.",
                "# TYPE educonnect_http_request_duration_seconds_count counter",
            ]
        )
        for (method, route), value in duration_count_items:
            lines.append(
                f'educonnect_http_request_duration_seconds_count{{method="{_label(method)}",route="{_label(route)}"}} {value}'
            )

        lines.extend(
            [
                "# HELP educonnect_http_5xx_errors_total Total API 5xx responses by method and route.",
                "# TYPE educonnect_http_5xx_errors_total counter",
            ]
        )
        for (method, route), value in error_items:
            lines.append(f'educonnect_http_5xx_errors_total{{method="{_label(method)}",route="{_label(route)}"}} {value}')

        if db_pool:
            lines.extend(
                [
                    "# HELP educonnect_db_pool_connections SQLAlchemy database pool snapshot.",
                    "# TYPE educonnect_db_pool_connections gauge",
                ]
            )
            for name, value in sorted(db_pool.items()):
                if value is not None:
                    lines.append(f'educonnect_db_pool_connections{{state="{_label(name)}"}} {value}')

        return "\n".join(lines) + "\n"


metrics = InMemoryMetrics()


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            route = getattr(request.scope.get("route"), "path", request.url.path)
            metrics.record(
                method=request.method.upper(),
                route=route,
                status_code=status_code,
                duration_seconds=time.perf_counter() - started,
            )
