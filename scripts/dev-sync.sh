#!/bin/bash
set -e

# ─── CHPMS Dev Database Sync ───
# Restores the shared dev snapshot so every developer has identical data.
# Run this when you pull new changes or want to reset your local DB.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SNAPSHOT="$PROJECT_DIR/snapshots/dev-snapshot.sql"

cd "$PROJECT_DIR"

if [ ! -f "$SNAPSHOT" ]; then
  echo "✗ No snapshot found at snapshots/dev-snapshot.sql"
  echo "  Run 'npm run dev:setup' first, or pull the latest snapshot from git."
  exit 1
fi

echo "═══════════════════════════════════════════"
echo "  CHPMS — Sync Dev Database"
echo "═══════════════════════════════════════════"
echo ""

# Ensure DB is running
echo "→ Ensuring PostgreSQL is running..."
docker compose -f docker-compose.dev.yml up -d
until docker compose -f docker-compose.dev.yml exec -T db pg_isready -U chpms_user -d chpms_dev > /dev/null 2>&1; do
  sleep 1
done
echo "  ✓ Database is ready"

# Restore snapshot
echo ""
echo "→ Restoring snapshot..."
docker compose -f docker-compose.dev.yml exec -T db \
  psql -U chpms_user -d chpms_dev < "$SNAPSHOT"
echo "  ✓ Database restored from snapshot"

# Regenerate Prisma client (in case schema changed)
echo ""
echo "→ Regenerating Prisma client..."
npx prisma generate
echo "  ✓ Prisma client up to date"

echo ""
echo "═══════════════════════════════════════════"
echo "  Sync complete! All developers now have"
echo "  the same database state."
echo ""
echo "  Start dev server:  npm run dev"
echo "═══════════════════════════════════════════"
