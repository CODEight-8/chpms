#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate --accept-data-loss

# Only seed on first run (owner account + default product)
mkdir -p /app/data
if [ ! -f /app/data/.seeded ]; then
  echo "First run — seeding database..."
  node prisma/compiled/seed.js && touch /app/data/.seeded
else
  echo "Already seeded, skipping."
fi

# DB integrity check
echo "Verifying database connection..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT 1\`.then(() => { console.log('DB connection OK'); p.\$disconnect(); }).catch((e) => { console.error('DB check failed:', e.message); process.exit(1); });
"

echo "Starting application with PM2..."
npx pm2-runtime start ecosystem.config.js
