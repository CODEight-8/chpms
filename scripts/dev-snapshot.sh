#!/bin/bash
set -e

# ─── CHPMS Dev Snapshot Export ───
# Exports current dev database to a snapshot file.
# Commit the snapshot to git so all developers can sync to it.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "→ Exporting dev database snapshot..."

mkdir -p snapshots

docker compose -f docker-compose.dev.yml exec -T db \
  pg_dump -U chpms_user -d chpms_dev --clean --if-exists --no-owner \
  > snapshots/dev-snapshot.sql

echo "✓ Snapshot saved to snapshots/dev-snapshot.sql"
echo ""
echo "Commit and push this file so other developers can sync:"
echo "  git add snapshots/dev-snapshot.sql"
echo "  git commit -m 'chore: update dev database snapshot'"
echo "  git push"
