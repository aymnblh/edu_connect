from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.check_staging_parity import validate as validate_staging_parity
from scripts.generate_production_env import env_values, validate_generated_env


SENSITIVE_KEYS = {
    "DATABASE_URL",
    "POSTGRES_SUPERUSER_PASSWORD",
    "APP_DB_PASSWORD",
    "PLATFORM_SECRET",
    "SERVER_FINGERPRINT_SALT",
    "NTFY_AUTH_TOKEN",
}

DISPLAY_KEYS = [
    "APP_ENV",
    "POSTGRES_DB",
    "FQDN",
    "CORS_ORIGINS",
    "NTFY_TOPIC_PREFIX",
    "CREATE_TABLES_ON_STARTUP",
    "MEDIA_MALWARE_SCAN_REQUIRED",
    "BACKUP_RETENTION_DAYS",
]


def _read_env(path: Path) -> dict[str, str]:
    return env_values(path.read_text(encoding="utf-8"))


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]


def _redact_database_url(value: str) -> str:
    return re.sub(r"://([^:/@]+):([^@]+)@", r"://\1:<redacted>@", value)


def _secret_summary(values: dict[str, str], key: str) -> str:
    value = values.get(key, "")
    if not value:
        return "missing"
    if key == "DATABASE_URL":
        redacted = _redact_database_url(value)
        return f"set, fingerprint={_fingerprint(value)}, redacted={redacted}"
    return f"set, length={len(value)}, fingerprint={_fingerprint(value)}"


def _render_env(name: str, path: Path, values: dict[str, str]) -> list[str]:
    lines = [f"{name}: {path}"]
    for key in DISPLAY_KEYS:
        lines.append(f"- {key}: {values.get(key, '(missing)')}")
    lines.append("- Secrets:")
    for key in sorted(SENSITIVE_KEYS):
        lines.append(f"  - {key}: {_secret_summary(values, key)}")
    return lines


def build_report(production_env: Path, staging_env: Path) -> tuple[str, int]:
    failures: list[str] = []
    lines = [
        "EduConnect Environment Readiness Review",
        "=======================================",
    ]

    if not production_env.exists():
        failures.append(f"missing production env: {production_env}")
    if not staging_env.exists():
        failures.append(f"missing staging env: {staging_env}")

    if failures:
        lines.extend(f"- {failure}" for failure in failures)
        return "\n".join(lines), 1

    production_text = production_env.read_text(encoding="utf-8")
    staging_text = staging_env.read_text(encoding="utf-8")
    production_values = env_values(production_text)
    staging_values = env_values(staging_text)

    lines.extend(_render_env("Production", production_env, production_values))
    lines.append("")
    lines.extend(_render_env("Staging", staging_env, staging_values))

    for label, content in (("production", production_text), ("staging", staging_text)):
        for failure in validate_generated_env(content):
            failures.append(f"{label}: {failure}")

    failures.extend(validate_staging_parity(production_env, staging_env))

    lines.append("")
    if failures:
        lines.append("Result: FAIL")
        lines.extend(f"- {failure}" for failure in failures)
        return "\n".join(lines), 1

    lines.append("Result: PASS")
    lines.append("Generated production and staging env files are ready for human review/promotion.")
    lines.append("No secret values were printed; use fingerprints only to compare rotations.")
    return "\n".join(lines), 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Review generated production/staging env files without printing secrets."
    )
    parser.add_argument("--production-env", default=str(ROOT / ".env.production.generated"))
    parser.add_argument("--staging-env", default=str(ROOT / ".env.staging.generated"))
    args = parser.parse_args()

    report, exit_code = build_report(
        Path(args.production_env).resolve(),
        Path(args.staging_env).resolve(),
    )
    print(report)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
