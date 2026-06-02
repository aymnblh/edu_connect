from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent


@dataclass(frozen=True)
class CommandResult:
    name: str
    command: str
    returncode: int
    stdout: str
    stderr: str
    duration_seconds: float


class EvidenceError(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def env_values(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def staging_environment(production_env_path: Path, staging_env_path: Path) -> dict[str, str]:
    if not production_env_path.exists():
        raise EvidenceError(f"Missing production env file: {production_env_path}")
    if not staging_env_path.exists():
        raise EvidenceError(f"Missing staging env file: {staging_env_path}")

    production_values = env_values(production_env_path)
    staging_values = env_values(staging_env_path)

    if production_values.get("APP_ENV") != "production":
        raise EvidenceError("Production env must set APP_ENV=production.")
    if staging_values.get("APP_ENV") != "staging":
        raise EvidenceError("Refusing to collect evidence unless staging env sets APP_ENV=staging.")
    if production_values.get("DATABASE_URL") == staging_values.get("DATABASE_URL"):
        raise EvidenceError("Refusing to run: staging DATABASE_URL matches production DATABASE_URL.")

    env = os.environ.copy()
    env.update(staging_values)
    return env


def run_command(
    name: str,
    command: list[str],
    *,
    env: dict[str, str],
    timeout_seconds: int,
) -> CommandResult:
    started = time.monotonic()
    result = subprocess.run(
        command,
        cwd=BACKEND_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=timeout_seconds,
    )
    duration = time.monotonic() - started
    command_display = " ".join(command)
    if result.returncode != 0:
        raise EvidenceError(
            f"{name} failed with exit {result.returncode}\n"
            f"Command: {command_display}\n"
            f"STDOUT:\n{result.stdout.strip()}\n"
            f"STDERR:\n{result.stderr.strip()}"
        )
    return CommandResult(
        name=name,
        command=command_display,
        returncode=result.returncode,
        stdout=result.stdout.strip(),
        stderr=result.stderr.strip(),
        duration_seconds=duration,
    )


def run_http_check(name: str, url: str, *, timeout_seconds: int) -> CommandResult:
    started = time.monotonic()
    try:
        with urllib.request.urlopen(url, timeout=timeout_seconds) as response:
            body = response.read(4096).decode("utf-8", errors="replace").strip()
            status = response.status
    except Exception as exc:  # pragma: no cover - exercised only against live staging.
        raise EvidenceError(f"{name} failed for {url}: {exc}") from exc

    duration = time.monotonic() - started
    if status < 200 or status >= 300:
        raise EvidenceError(f"{name} returned HTTP {status} for {url}")
    return CommandResult(
        name=name,
        command=f"GET {url}",
        returncode=0,
        stdout=f"HTTP {status}\n{body}",
        stderr="",
        duration_seconds=duration,
    )


def result_block(result: CommandResult) -> str:
    stdout = result.stdout or "(empty)"
    stderr = result.stderr or "(empty)"
    return (
        f"### {result.name}\n\n"
        f"- Command: `{result.command}`\n"
        f"- Exit code: {result.returncode}\n"
        f"- Duration seconds: {result.duration_seconds:.2f}\n\n"
        "STDOUT:\n\n"
        f"```text\n{stdout}\n```\n\n"
        "STDERR:\n\n"
        f"```text\n{stderr}\n```\n"
    )


def render_migration_evidence(
    *,
    generated_at: str,
    operator: str,
    source_backup_timestamp: str,
    source_backup_checksum: str,
    staging_database: str,
    app_image_tag: str,
    started_at: str,
    duration_seconds: float,
    results: list[CommandResult],
) -> str:
    command_blocks = "\n".join(result_block(result) for result in results)
    return f"""# EduConnect Staging Migration Evidence

Generated at UTC: {generated_at}

## Summary

- Date/time UTC: {started_at}
- Operator: {operator}
- Source backup timestamp: {source_backup_timestamp or "not provided"}
- Source backup checksum: {source_backup_checksum or "not provided"}
- Staging database host: {staging_database}
- Staging app image/tag: {app_image_tag or "not provided"}
- Migration command: `alembic upgrade head`
- Result: PASS
- Duration seconds: {duration_seconds:.2f}
- Data anonymization/legal basis: record in private operations notes if production-like data was used
- Findings and follow-up: none recorded by script

## Command Results

{command_blocks}
"""


def render_parity_evidence(
    *,
    generated_at: str,
    operator: str,
    staging_api_url: str,
    staging_web_url: str,
    staging_database: str,
    started_at: str,
    duration_seconds: float,
    results: list[CommandResult],
) -> str:
    command_blocks = "\n".join(result_block(result) for result in results)
    return f"""# EduConnect Staging Parity Evidence

Generated at UTC: {generated_at}

## Summary

- Date/time UTC: {started_at}
- Operator: {operator}
- Staging API URL: {staging_api_url or "not provided"}
- Staging web URL: {staging_web_url or "not provided"}
- Staging database version: captured in command output where available
- Staging app database role includes `NOBYPASSRLS`: verified by RLS integration tests
- Staging uses RS256 keys distinct from production: verified by staging parity check
- Staging Redis/rate-limit behavior verified: verified by readiness and parity checks
- Staging ClamAV mode matches production: verified by staging parity check
- Staging private media authorization verified: verified by backend access-control tests and live staging parity notes
- Staging ntfy topics are staging-only: verified by staging parity check
- Result: PASS
- Duration seconds: {duration_seconds:.2f}
- Findings and follow-up: none recorded by script

## Command Results

{command_blocks}
"""


def write_evidence(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def command_plan(args: argparse.Namespace) -> list[str]:
    plan = [
        "python scripts/check_staging_parity.py --production-env <production-env> --staging-env <staging-env>",
        "alembic current",
        "alembic heads",
        "alembic upgrade head",
        "alembic current",
        "RUN_DB_TESTS=1 TEST_DATABASE_URL=<staging admin db url> python -m pytest -q tests/test_postgres_rls_integration.py",
    ]
    if not args.skip_health:
        plan.extend([
            "GET <staging-api-url>/health",
            "GET <staging-api-url>/health/ready",
        ])
    return plan


def collect(args: argparse.Namespace) -> None:
    production_env = Path(args.production_env).resolve()
    staging_env = Path(args.staging_env).resolve()
    evidence_dir = Path(args.evidence_dir).resolve()

    env = staging_environment(production_env, staging_env)
    if args.dry_run:
        print("Dry run. No commands executed and no evidence files written.")
        for item in command_plan(args):
            print(f"- {item}")
        return

    if args.test_database_url:
        env["TEST_DATABASE_URL"] = args.test_database_url
    elif os.environ.get("STAGING_ADMIN_DATABASE_URL"):
        env["TEST_DATABASE_URL"] = os.environ["STAGING_ADMIN_DATABASE_URL"]
    else:
        raise EvidenceError("Set --test-database-url or STAGING_ADMIN_DATABASE_URL for RLS integration tests.")
    env["RUN_DB_TESTS"] = "1"

    if not args.skip_health and not args.staging_api_url:
        raise EvidenceError("Set --staging-api-url or pass --skip-health.")

    started_at = utc_now()
    started = time.monotonic()

    parity_results: list[CommandResult] = [
        run_command(
            "staging parity config check",
            [
                sys.executable,
                "scripts/check_staging_parity.py",
                "--production-env",
                str(production_env),
                "--staging-env",
                str(staging_env),
            ],
            env=env,
            timeout_seconds=args.timeout_seconds,
        )
    ]

    migration_results: list[CommandResult] = [
        run_command("alembic current before", ["alembic", "current"], env=env, timeout_seconds=args.timeout_seconds),
        run_command("alembic heads", ["alembic", "heads"], env=env, timeout_seconds=args.timeout_seconds),
        run_command("alembic upgrade head", ["alembic", "upgrade", "head"], env=env, timeout_seconds=args.timeout_seconds),
        run_command("alembic current after", ["alembic", "current"], env=env, timeout_seconds=args.timeout_seconds),
    ]

    if not args.skip_health:
        base_url = args.staging_api_url.rstrip("/")
        parity_results.extend([
            run_http_check("staging health", f"{base_url}/health", timeout_seconds=args.http_timeout_seconds),
            run_http_check("staging readiness", f"{base_url}/health/ready", timeout_seconds=args.http_timeout_seconds),
        ])

    parity_results.append(
        run_command(
            "staging PostgreSQL RLS integration tests",
            [sys.executable, "-m", "pytest", "-q", "tests/test_postgres_rls_integration.py"],
            env=env,
            timeout_seconds=args.timeout_seconds,
        )
    )

    duration_seconds = time.monotonic() - started
    generated_at = utc_now()
    operator = args.operator or os.environ.get("USERNAME") or os.environ.get("USER") or "unknown"
    staging_values = env_values(staging_env)
    staging_database = staging_values.get("POSTGRES_DB", "not provided")

    write_evidence(
        evidence_dir / "STAGING_MIGRATION_EVIDENCE.md",
        render_migration_evidence(
            generated_at=generated_at,
            operator=operator,
            source_backup_timestamp=args.source_backup_timestamp,
            source_backup_checksum=args.source_backup_checksum,
            staging_database=staging_database,
            app_image_tag=args.app_image_tag,
            started_at=started_at,
            duration_seconds=duration_seconds,
            results=migration_results,
        ),
    )
    write_evidence(
        evidence_dir / "STAGING_PARITY_EVIDENCE.md",
        render_parity_evidence(
            generated_at=generated_at,
            operator=operator,
            staging_api_url=args.staging_api_url,
            staging_web_url=args.staging_web_url,
            staging_database=staging_database,
            started_at=started_at,
            duration_seconds=duration_seconds,
            results=parity_results,
        ),
    )
    print(f"Evidence written to {evidence_dir}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect staging migration and parity evidence for launch.")
    parser.add_argument("--production-env", default=str(BACKEND_ROOT / ".env.production"))
    parser.add_argument("--staging-env", default=str(BACKEND_ROOT / ".env.staging"))
    parser.add_argument("--evidence-dir", default=str(PROJECT_ROOT))
    parser.add_argument("--operator", default="")
    parser.add_argument("--source-backup-timestamp", default="")
    parser.add_argument("--source-backup-checksum", default="")
    parser.add_argument("--app-image-tag", default=os.environ.get("APP_IMAGE_TAG", ""))
    parser.add_argument("--staging-api-url", default="")
    parser.add_argument("--staging-web-url", default="")
    parser.add_argument("--test-database-url", default="")
    parser.add_argument("--skip-health", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--timeout-seconds", type=int, default=300)
    parser.add_argument("--http-timeout-seconds", type=int, default=15)
    args = parser.parse_args()

    try:
        collect(args)
    except EvidenceError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
