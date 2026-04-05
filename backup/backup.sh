#!/bin/sh
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DAY_OF_WEEK=$(date +%u)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
RETENTION_WEEKS=${BACKUP_RETENTION_WEEKS:-4}

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

echo "[$DATE] Starting backup..."

# Daily backup
DAILY_FILE="$BACKUP_DIR/daily/chpms_$DATE.sql.gz"
pg_dump -Fc | gzip > "$DAILY_FILE"
echo "[$DATE] Daily backup created: $DAILY_FILE"

# Weekly backup on Sunday (day 7)
if [ "$DAY_OF_WEEK" = "7" ]; then
  WEEKLY_FILE="$BACKUP_DIR/weekly/chpms_weekly_$DATE.sql.gz"
  cp "$DAILY_FILE" "$WEEKLY_FILE"
  echo "[$DATE] Weekly backup created: $WEEKLY_FILE"
fi

# Rotate daily backups — keep last N days
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

# Rotate weekly backups — keep last N weeks
WEEKLY_KEEP_DAYS=$((RETENTION_WEEKS * 7))
find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +"$WEEKLY_KEEP_DAYS" -delete 2>/dev/null || true

# Update last_backup_at in system_status table
psql -c "INSERT INTO system_status (key, value, updated_at) VALUES ('last_backup_at', '$(date -u +%Y-%m-%dT%H:%M:%SZ)', NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();" 2>/dev/null || true

echo "[$DATE] Backup complete."
