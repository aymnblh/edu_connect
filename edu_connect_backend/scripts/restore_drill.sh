#!/usr/bin/env bash
set -euo pipefail

# Restores a backup archive into a non-production compose environment and runs
# the minimum checks needed to prove the backup is usable.
# Usage:
#   STAGING_ENV_FILE=.env.staging BACKUP_ARCHIVE=./backups/educonnect-YYYYMMDDTHHMMSSZ.tar.gz ./scripts/restore_drill.sh

STAGING_ENV_FILE="${STAGING_ENV_FILE:-.env.staging}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_ARCHIVE="${BACKUP_ARCHIVE:-}"
RESTORE_WORK_DIR="${RESTORE_WORK_DIR:-./restore_work}"
DRILL_REPORT_PATH="${DRILL_REPORT_PATH:-}"
DRILL_OPERATOR="${DRILL_OPERATOR:-unknown}"
started_at_epoch="$(date -u +%s)"
started_at_iso="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [[ ! -f "$STAGING_ENV_FILE" ]]; then
  echo "Missing staging env file: $STAGING_ENV_FILE" >&2
  exit 1
fi
if [[ -z "$BACKUP_ARCHIVE" || ! -f "$BACKUP_ARCHIVE" ]]; then
  echo "Set BACKUP_ARCHIVE to an existing backup archive." >&2
  exit 1
fi

set -a
source "$STAGING_ENV_FILE"
set +a

if [[ "${APP_ENV:-}" == "production" ]]; then
  echo "Refusing to restore into APP_ENV=production." >&2
  exit 1
fi

: "${POSTGRES_SUPERUSER:?POSTGRES_SUPERUSER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

rm -rf "$RESTORE_WORK_DIR"
mkdir -p "$RESTORE_WORK_DIR"
tar -xzf "$BACKUP_ARCHIVE" -C "$RESTORE_WORK_DIR"
snapshot_dir="$(find "$RESTORE_WORK_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
backup_timestamp="$(basename "$snapshot_dir")"

if [[ -z "$snapshot_dir" || ! -f "${snapshot_dir}/database.dump" ]]; then
  echo "Backup archive does not contain database.dump." >&2
  exit 1
fi

echo "Starting staging database"
docker compose --env-file "$STAGING_ENV_FILE" -f "$COMPOSE_FILE" up -d db

echo "Restoring database into staging"
docker compose --env-file "$STAGING_ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  pg_restore -U "$POSTGRES_SUPERUSER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl \
  < "${snapshot_dir}/database.dump"

if [[ -d "${snapshot_dir}/volumes/private_media" ]]; then
  echo "Restoring private media into staging worktree"
  rm -rf private_media
  cp -a "${snapshot_dir}/volumes/private_media" private_media
fi

echo "Applying migrations"
docker compose --env-file "$STAGING_ENV_FILE" -f "$COMPOSE_FILE" run --rm api alembic upgrade head

echo "Starting staging API"
docker compose --env-file "$STAGING_ENV_FILE" -f "$COMPOSE_FILE" up -d api

echo "Checking readiness"
docker compose --env-file "$STAGING_ENV_FILE" -f "$COMPOSE_FILE" exec -T api \
  python - <<'PY'
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def main():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))

asyncio.run(main())
print("database ok")
PY

echo "Restore drill completed. Record the archive timestamp, operator, duration, and findings in the runbook log."

if [[ -n "$DRILL_REPORT_PATH" ]]; then
  finished_at_epoch="$(date -u +%s)"
  duration_seconds=$((finished_at_epoch - started_at_epoch))
  mkdir -p "$(dirname "$DRILL_REPORT_PATH")"
  if [[ ! -f "$DRILL_REPORT_PATH" ]]; then
    cat > "$DRILL_REPORT_PATH" <<'EOF'
# EduConnect Restore Drill Log

| Date UTC | Operator | Backup Timestamp | Environment | Duration | Result | Findings / Follow-Up |
| --- | --- | --- | --- | --- | --- | --- |
EOF
  fi
  printf '| %s | %s | %s | %s | %ss | PASS | Restored `%s`; migrations and readiness checks passed. |\n' \
    "$started_at_iso" "$DRILL_OPERATOR" "$backup_timestamp" "${APP_ENV:-staging}" "$duration_seconds" "$BACKUP_ARCHIVE" \
    >> "$DRILL_REPORT_PATH"
fi
