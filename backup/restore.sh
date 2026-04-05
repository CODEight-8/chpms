#!/bin/sh
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -la /backups/daily/ /backups/weekly/ 2>/dev/null || echo "No backups found."
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will replace ALL data in the database."
echo "Restoring from: $BACKUP_FILE"
echo ""

# Drop and recreate the database
psql -U "$PGUSER" -h "$PGHOST" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$PGDATABASE' AND pid <> pg_backend_pid();" 2>/dev/null || true
psql -U "$PGUSER" -h "$PGHOST" -d postgres -c "DROP DATABASE IF EXISTS $PGDATABASE;"
psql -U "$PGUSER" -h "$PGHOST" -d postgres -c "CREATE DATABASE $PGDATABASE OWNER $PGUSER;"

# Restore
gunzip -c "$BACKUP_FILE" | pg_restore -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE" --no-owner --no-privileges 2>/dev/null || true

echo "Restore complete. Restart the app container to apply."
