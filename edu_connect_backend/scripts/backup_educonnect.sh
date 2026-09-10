#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
LOCAL_BACKUP_DIR="${BACKUP_LOCAL_DIR:-./backups}"
REMOTE_HOST="${BACKUP_REMOTE_HOST:-}"
REMOTE_PATH="${BACKUP_REMOTE_PATH:-}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-35}"

[[ -f "$ENV_FILE" ]] || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }

set -a
source "$ENV_FILE"
set +a

: "${POSTGRES_SUPERUSER:?POSTGRES_SUPERUSER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"

command -v age >/dev/null 2>&1 || {
  echo "The age command is required to encrypt backups." >&2
  exit 1
}

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="${LOCAL_BACKUP_DIR}/${timestamp}"
plain_archive="${LOCAL_BACKUP_DIR}/educonnect-${timestamp}.tar.gz"
encrypted_archive="${plain_archive}.age"

cleanup() {
  rm -rf -- "$work_dir"
  rm -f -- "$plain_archive"
}
trap cleanup EXIT

mkdir -p "$work_dir"

echo "[1/6] Dumping PostgreSQL"
compose exec -T db \
  pg_dump -U "$POSTGRES_SUPERUSER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl \
  > "${work_dir}/database.dump"
database_dump_sha256="$(sha256sum "${work_dir}/database.dump" | awk '{print $1}')"

echo "[2/6] Exporting the private media Docker volume"
compose run --rm --no-deps --entrypoint sh api \
  -c 'tar -C /app/private_media -czf - .' \
  > "${work_dir}/private_media.tar.gz"

echo "[3/6] Copying encrypted-backup inputs"
mkdir -p "${work_dir}/secrets"
cp -a secrets/. "${work_dir}/secrets/"
cp "$ENV_FILE" "${work_dir}/environment.env"

cat > "${work_dir}/manifest.txt" <<EOF
timestamp=${timestamp}
database=${POSTGRES_DB}
database_dump_sha256=${database_dump_sha256}
app_env=${APP_ENV:-}
fqdn=${FQDN:-}
web_fqdn=${WEB_FQDN:-}
alembic_current=$(compose exec -T api alembic current 2>/dev/null || true)
EOF

echo "[4/6] Creating backup archive"
tar -czf "$plain_archive" -C "$LOCAL_BACKUP_DIR" "$timestamp"

echo "[5/6] Encrypting backup with age"
age -r "$BACKUP_AGE_RECIPIENT" -o "$encrypted_archive" "$plain_archive"
sha256sum "$encrypted_archive" > "${encrypted_archive}.sha256"

echo "[6/6] Applying retention and off-site sync"
find "$LOCAL_BACKUP_DIR" -name "educonnect-*.tar.gz.age" -mtime +"$RETENTION_DAYS" -delete
find "$LOCAL_BACKUP_DIR" -name "educonnect-*.tar.gz.age.sha256" -mtime +"$RETENTION_DAYS" -delete

if [[ -n "$REMOTE_HOST" && -n "$REMOTE_PATH" ]]; then
  command -v rsync >/dev/null 2>&1 || {
    echo "rsync is required for off-site backup sync." >&2
    exit 1
  }
  rsync -az "$encrypted_archive" "${encrypted_archive}.sha256" "${REMOTE_HOST}:${REMOTE_PATH}/"
else
  echo "WARNING: off-site sync is not configured; the encrypted backup remains on this VPS." >&2
fi

echo "Encrypted backup complete: $encrypted_archive"
