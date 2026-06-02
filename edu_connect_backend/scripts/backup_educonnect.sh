#!/usr/bin/env bash
set -euo pipefail

# Creates a consistent EduConnect backup from the Docker production stack.
# Usage:
#   ENV_FILE=.env.production ./scripts/backup_educonnect.sh

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
LOCAL_BACKUP_DIR="${BACKUP_LOCAL_DIR:-./backups}"
REMOTE_HOST="${BACKUP_REMOTE_HOST:-}"
REMOTE_PATH="${BACKUP_REMOTE_PATH:-}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-35}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

: "${POSTGRES_SUPERUSER:?POSTGRES_SUPERUSER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="${LOCAL_BACKUP_DIR}/${timestamp}"
archive="${LOCAL_BACKUP_DIR}/educonnect-${timestamp}.tar.gz"

mkdir -p "$work_dir"

echo "Starting EduConnect backup: $timestamp"

echo "[1/5] Dumping PostgreSQL database"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_SUPERUSER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl \
  > "${work_dir}/database.dump"
database_dump_sha256="$(sha256sum "${work_dir}/database.dump" | awk '{print $1}')"

echo "[2/5] Copying private media and operational state"
mkdir -p "${work_dir}/volumes"
for path in private_media secrets letsencrypt ntfy_data; do
  if [[ -d "$path" ]]; then
    cp -a "$path" "${work_dir}/volumes/${path}"
  fi
done

echo "[3/5] Writing manifest"
cat > "${work_dir}/manifest.txt" <<EOF
timestamp=${timestamp}
database=${POSTGRES_DB}
database_dump_sha256=${database_dump_sha256}
app_env=${APP_ENV:-}
fqdn=${FQDN:-}
alembic_current=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api alembic current 2>/dev/null || true)
EOF

echo "[4/5] Compressing backup"
tar -czf "$archive" -C "$LOCAL_BACKUP_DIR" "$timestamp"
rm -rf "$work_dir"

echo "[5/5] Applying local retention (${RETENTION_DAYS} days)"
find "$LOCAL_BACKUP_DIR" -name "educonnect-*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

if [[ -n "$REMOTE_HOST" && -n "$REMOTE_PATH" ]]; then
  echo "Syncing backups to ${REMOTE_HOST}:${REMOTE_PATH}"
  rsync -az --delete "$LOCAL_BACKUP_DIR/" "${REMOTE_HOST}:${REMOTE_PATH}"
else
  echo "Remote backup sync skipped; BACKUP_REMOTE_HOST or BACKUP_REMOTE_PATH is empty."
fi

echo "Backup complete: $archive"
