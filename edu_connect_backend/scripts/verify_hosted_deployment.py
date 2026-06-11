from __future__ import annotations

import argparse
import sys
import time
from dataclasses import dataclass
from typing import Any, Callable
from urllib.parse import urljoin

import httpx


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str


def _url(base: str, path: str) -> str:
    return urljoin(base.rstrip("/") + "/", path.lstrip("/"))


def _with_retries(
    name: str,
    fn: Callable[[], CheckResult],
    *,
    attempts: int,
    delay_seconds: float,
) -> CheckResult:
    last: CheckResult | None = None
    for attempt in range(1, attempts + 1):
        last = fn()
        if last.ok:
            if attempt > 1:
                return CheckResult(last.name, True, f"{last.detail} after {attempt} attempts")
            return last
        if attempt < attempts:
            time.sleep(delay_seconds)
    return last or CheckResult(name, False, "check did not run")


def _json_get(client: httpx.Client, url: str) -> tuple[int, dict[str, Any]]:
    response = client.get(url)
    try:
        data = response.json()
    except ValueError:
        data = {"raw": response.text[:300]}
    return response.status_code, data


def check_api_health(
    client: httpx.Client,
    api_url: str,
    expect_environment: str | None,
    *,
    attempts: int,
    delay_seconds: float,
) -> CheckResult:
    return _with_retries(
        "API health",
        lambda: _check_api_health_once(client, api_url, expect_environment),
        attempts=attempts,
        delay_seconds=delay_seconds,
    )


def _check_api_health_once(client: httpx.Client, api_url: str, expect_environment: str | None) -> CheckResult:
    try:
        status_code, data = _json_get(client, _url(api_url, "/health"))
    except Exception as exc:
        return CheckResult("API health", False, str(exc))

    if status_code != 200:
        return CheckResult("API health", False, f"HTTP {status_code}: {data}")
    if data.get("status") != "ok":
        return CheckResult("API health", False, f"unexpected body: {data}")
    if expect_environment and data.get("environment") != expect_environment:
        return CheckResult(
            "API environment",
            False,
            f"expected {expect_environment!r}, got {data.get('environment')!r}",
        )
    return CheckResult("API health", True, f"environment={data.get('environment')} version={data.get('version')}")


def check_api_readiness(
    client: httpx.Client,
    api_url: str,
    *,
    attempts: int,
    delay_seconds: float,
) -> CheckResult:
    return _with_retries(
        "API readiness",
        lambda: _check_api_readiness_once(client, api_url),
        attempts=attempts,
        delay_seconds=delay_seconds,
    )


def _check_api_readiness_once(client: httpx.Client, api_url: str) -> CheckResult:
    try:
        status_code, data = _json_get(client, _url(api_url, "/health/ready"))
    except Exception as exc:
        return CheckResult("API readiness", False, str(exc))

    if status_code != 200:
        return CheckResult("API readiness", False, f"HTTP {status_code}: {data}")
    if data.get("status") != "ready":
        return CheckResult("API readiness", False, f"unexpected body: {data}")
    checks = data.get("checks") or {}
    if checks.get("database") != "ok" or checks.get("redis") != "ok":
        return CheckResult("API dependencies", False, f"checks={checks}")
    return CheckResult("API readiness", True, f"checks={checks}")


def check_openapi(
    client: httpx.Client,
    api_url: str,
    *,
    attempts: int,
    delay_seconds: float,
) -> CheckResult:
    return _with_retries(
        "OpenAPI",
        lambda: _check_openapi_once(client, api_url),
        attempts=attempts,
        delay_seconds=delay_seconds,
    )


def _check_openapi_once(client: httpx.Client, api_url: str) -> CheckResult:
    try:
        status_code, data = _json_get(client, _url(api_url, "/openapi.json"))
    except Exception as exc:
        return CheckResult("OpenAPI", False, str(exc))

    if status_code != 200:
        return CheckResult("OpenAPI", False, f"HTTP {status_code}: {data}")
    paths = data.get("paths") or {}
    required = ["/auth/login", "/admin/staff", "/health/ready"]
    missing = [path for path in required if path not in paths]
    if missing:
        return CheckResult("OpenAPI", False, f"missing paths: {', '.join(missing)}")
    return CheckResult("OpenAPI", True, f"{len(paths)} paths exposed")


def check_cors(client: httpx.Client, api_url: str, web_url: str) -> CheckResult:
    try:
        response = client.options(
            _url(api_url, "/auth/login"),
            headers={
                "Origin": web_url.rstrip("/"),
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
        )
    except Exception as exc:
        return CheckResult("CORS", False, str(exc))

    allow_origin = response.headers.get("access-control-allow-origin")
    if response.status_code not in {200, 204}:
        return CheckResult("CORS", False, f"HTTP {response.status_code}")
    if allow_origin != web_url.rstrip("/"):
        return CheckResult("CORS", False, f"allow-origin={allow_origin!r}")
    return CheckResult("CORS", True, f"allow-origin={allow_origin}")


def check_web_route(client: httpx.Client, web_url: str, path: str) -> CheckResult:
    try:
        response = client.get(_url(web_url, path))
    except Exception as exc:
        return CheckResult(f"Web {path}", False, str(exc))

    if response.status_code != 200:
        return CheckResult(f"Web {path}", False, f"HTTP {response.status_code}")
    if '<div id="root">' not in response.text:
        return CheckResult(f"Web {path}", False, "React root not found")
    return CheckResult(f"Web {path}", True, f"{len(response.text)} bytes")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify hosted Render/Vercel deployment.")
    parser.add_argument("--api-url", required=True, help="Hosted API base URL, e.g. https://...onrender.com")
    parser.add_argument("--web-url", required=True, help="Hosted web URL, e.g. https://...vercel.app")
    parser.add_argument("--expect-environment", default="production")
    parser.add_argument("--timeout", type=float, default=20)
    parser.add_argument("--attempts", type=int, default=4)
    parser.add_argument("--retry-delay-seconds", type=float, default=8)
    args = parser.parse_args()

    with httpx.Client(timeout=args.timeout, follow_redirects=True) as client:
        results = [
            check_api_health(
                client,
                args.api_url,
                args.expect_environment,
                attempts=args.attempts,
                delay_seconds=args.retry_delay_seconds,
            ),
            check_api_readiness(
                client,
                args.api_url,
                attempts=args.attempts,
                delay_seconds=args.retry_delay_seconds,
            ),
            check_openapi(
                client,
                args.api_url,
                attempts=args.attempts,
                delay_seconds=args.retry_delay_seconds,
            ),
            check_cors(client, args.api_url, args.web_url),
            check_web_route(client, args.web_url, "/login"),
            check_web_route(client, args.web_url, "/activate"),
            check_web_route(client, args.web_url, "/policies"),
        ]

    failures = [result for result in results if not result.ok]
    for result in results:
        status = "PASS" if result.ok else "FAIL"
        print(f"[{status}] {result.name}: {result.detail}")

    if failures:
        print(f"\n{len(failures)} hosted deployment check(s) failed.", file=sys.stderr)
        return 1

    print("\nHosted deployment checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
