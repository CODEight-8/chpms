#!/bin/bash
set -e

# ─── CHPMS Local Development Setup ───
# This script sets up a local dev environment without Docker for the app.
# It uses Docker only for PostgreSQL.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "═══════════════════════════════════════════"
echo "  CHPMS — Local Development Setup"
echo "═══════════════════════════════════════════"
echo ""

# 1. Copy env file (always overwrite to ensure correct dev settings)
echo "→ Setting up .env from .env.development..."
cp .env.development .env
echo "  ✓ .env configured for local development"

# 2. Start dev database
echo ""
echo "→ Starting PostgreSQL (Docker)..."
docker compose -f docker-compose.dev.yml up -d
echo "  ✓ PostgreSQL running on localhost:5434"

# 3. Wait for DB to be ready
echo ""
echo "→ Waiting for database to be ready..."
until docker compose -f docker-compose.dev.yml exec -T db pg_isready -U chpms_user -d chpms_dev > /dev/null 2>&1; do
  sleep 1
done
echo "  ✓ Database is ready"

# 4. Install dependencies
echo ""
echo "→ Installing npm dependencies..."
npm install
echo "  ✓ Dependencies installed"

# 5. Generate Prisma client
echo ""
echo "→ Generating Prisma client..."
npx prisma generate
echo "  ✓ Prisma client generated"

# 6. Push schema to database
echo ""
echo "→ Pushing schema to database..."
npx prisma db push
echo "  ✓ Schema synced"

# 7. Seed dev data
echo ""
echo "→ Seeding development data..."
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-dev.ts
echo "  ✓ Dev data seeded"

# 8. Export snapshot for team sync
echo ""
echo "→ Exporting database snapshot for team sync..."
mkdir -p snapshots
docker compose -f docker-compose.dev.yml exec -T db \
  pg_dump -U chpms_user -d chpms_dev --clean --if-exists --no-owner \
  > snapshots/dev-snapshot.sql
echo "  ✓ Snapshot saved to snapshots/dev-snapshot.sql"

echo ""
echo "═══════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  Start dev server:  npm run dev"
echo "  Prisma Studio:     npm run db:studio"
echo "  Sync DB snapshot:  npm run dev:sync"
echo ""
echo "  Login credentials:"
echo "    Owner:      owner@chpms.dev / owner123"
echo "    Manager:    manager@chpms.dev / manager123"
echo "    Production: production@chpms.dev / production123"
echo "═══════════════════════════════════════════"
