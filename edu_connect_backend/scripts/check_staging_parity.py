from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

SAME_VALUE_KEYS = {
    "JWT_ALGORITHM",
    "MAX_ACTIVE_SESSION_FAMILIES",
    "AUDIT_RETENTION_DAYS",
    "SECURITY_ALERT_STATUS_CODES",
    "SECURITY_ALERT_THRESHOLD",
    "SECURITY_ALERT_WINDOW_SECONDS",
    "SECURITY_ALERT_COOLDOWN_SECONDS",
    "CREATE_TABLES_ON_STARTUP",
    "MEDIA_STORAGE_PATH",
    "MEDIA_MAX_UPLOAD_BYTES",
    "MEDIA_MALWARE_SCAN_ENABLED",
    "MEDIA_MALWARE_SCAN_REQUIRED",
    "CLAMAV_HOST",
    "CLAMAV_PORT",
    "CLAMAV_TIMEOUT_SECONDS",
}

SEPARATE_VALUE_KEYS = {
    "DATABASE_URL",
    "POSTGRES_DB",
    "PLATFORM_SECRET",
    "SERVER_FINGERPRINT_SALT",
    "NTFY_AUTH_TOKEN",
    "NTFY_TOPIC_PREFIX",
    "FQDN",
    "CORS_ORIGINS",
}

PLACEHOLDER_RE = re.compile(r"(YOUR_|REPLACE_WITH|change-this|password)", re.IGNORECASE)


def env_values(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def _is_placeholder(value: str) -> bool:
    return bool(PLACEHOLDER_RE.search(value))


def validate(
    production_env: Path,
    staging_env: Path,
    *,
    allow_placeholders: bool = False,
) -> list[str]:
    failures: list[str] = []
    if not production_env.exists():
        return [f"Missing production env file: {production_env}"]
    if not staging_env.exists():
        return [f"Missing staging env file: {staging_env}"]

    prod = env_values(production_env)
    staging = env_values(staging_env)

    if prod.get("APP_ENV") != "production":
        failures.append("Production env must set APP_ENV=production.")
    if staging.get("APP_ENV") != "staging":
        failures.append("Staging env must set APP_ENV=staging.")

    for key in sorted(SAME_VALUE_KEYS):
        if key not in prod:
            failures.append(f"Production env is missing {key}.")
        if key not in staging:
            failures.append(f"Staging env is missing {key}.")
        if key in prod and key in staging and prod[key] != staging[key]:
            failures.append(f"{key} must match production in staging.")

    for key in sorted(SEPARATE_VALUE_KEYS):
        if key not in prod:
            failures.append(f"Production env is missing {key}.")
        if key not in staging:
            failures.append(f"Staging env is missing {key}.")
        if key in prod and key in staging and prod[key] == staging[key]:
            failures.append(f"{key} must be staging-specific, not copied from production.")

    for key in ("CORS_ORIGINS", "FQDN", "POSTGRES_DB", "NTFY_TOPIC_PREFIX"):
        value = staging.get(key, "")
        if "staging" not in value.lower():
            failures.append(f"Staging {key} should clearly identify the staging environment.")

    if staging.get("CREATE_TABLES_ON_STARTUP") != "false":
        failures.append("Staging must not auto-create tables at startup; use Alembic migrations.")
    if staging.get("JWT_ALGORITHM") != "RS256":
        failures.append("Staging must exercise RS256 auth, matching production.")
    if staging.get("MEDIA_MALWARE_SCAN_REQUIRED") != "true":
        failures.append("Staging must require malware scanning, matching production.")
    if not staging.get("CORS_ORIGINS", "").startswith("https://"):
        failures.append("Staging CORS origins must use explicit HTTPS origins.")

    if not allow_placeholders:
        for label, values in (("production", prod), ("staging", staging)):
            for key, value in values.items():
                if _is_placeholder(value):
                    failures.append(f"{label} env has placeholder value for {key}.")

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description="Check EduConnect staging parity against production.")
    parser.add_argument("--production-env", default=str(ROOT / ".env.production.example"))
    parser.add_argument("--staging-env", default=str(ROOT / ".env.staging.example"))
    parser.add_argument(
        "--allow-placeholders",
        action="store_true",
        help="Allow placeholder values when validating checked-in example env files.",
    )
    args = parser.parse_args()

    failures = validate(
        Path(args.production_env),
        Path(args.staging_env),
        allow_placeholders=args.allow_placeholders,
    )
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}", file=sys.stderr)
        return 1

    print("staging parity checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
