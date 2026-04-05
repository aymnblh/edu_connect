# --- Configuration (Externalized to .env) ---
BACKUP_SERVER="${BACKUP_REMOTE_HOST:-user@backup-vps}"
BACKUP_PATH="${BACKUP_REMOTE_PATH:-/backups/educonnect/}"
NTFY_URL="${NTFY_BASE_URL:-http://ntfy}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "--- Starting EduConnect Backup ($TIMESTAMP) ---"

# 1. Database Backup (PostgreSQL)
echo "[1/4] Dumping PostgreSQL database..."
pg_dump -U edu_user edu_connect > "$BACKUP_DIR/db_dump.sql" 2>/dev/null 

if [ $? -ne 0 ]; then
    echo "ERROR: PostgreSQL dump failed."
    curl -H "Title: Backup Failed" -H "Priority: urgent" -H "Tags: warning,skull" \
         -d "PostgreSQL dump error on $TIMESTAMP. Check logs." \
         "$NTFY_URL/educonnect_alerts"
    exit 1
fi

# 2. Secret Keys & ntfy Data
echo "[2/4] Archiving RSA keys and ntfy data..."
[ -d "./secrets" ] && cp -r ./secrets "$BACKUP_DIR/secrets_backup"
[ -d "./ntfy_data" ] && cp -r ./ntfy_data "$BACKUP_DIR/ntfy_data_backup"

# 3. Compression & Retention (Local)
echo "[3/4] Compressing archive and applying 30-day retention..."
ARCHIVE="./backups/educonnect_backup_$TIMESTAMP.tar.gz"
tar -czf "$ARCHIVE" -C "./backups" "$TIMESTAMP"
rm -rf "$BACKUP_DIR"

# Retention (Keep 30 days)
find ./backups -name "educonnect_backup_*.tar.gz" -mtime +30 -delete

# 4. Sovereign Remote Sync (rsync)
echo "[4/4] Syncing to remote VPS via rsync..."
rsync -az --delete ./backups/ "$BACKUP_SERVER:$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo "--- Backup Success: Local & Remote ($TIMESTAMP) ---"
else
    echo "ERROR: Remote sync failed."
    curl -H "Title: Backup Sync Failed" -H "Priority: high" -H "Tags: cloud,warning" \
         -d "Rsync to $BACKUP_SERVER failed. Data is safe locally, but remote sync incomplete." \
         "$NTFY_URL/educonnect_alerts"
    exit 1
fi
