#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate --accept-data-loss

# Idempotent backfill: initialize available_output for COMPLETED batches that
# predate this column, accounting for any fulfillments already recorded.
echo "Backfilling production_batches.available_output if needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$executeRawUnsafe(
  \`UPDATE production_batches pb
   SET available_output = pb.output_quantity - COALESCE((
     SELECT SUM(of.quantity_fulfilled) FROM order_fulfillments of
     WHERE of.production_batch_id = pb.id
   ), 0)
   WHERE pb.available_output IS NULL AND pb.output_quantity IS NOT NULL\`
).then((n) => { console.log('Backfilled rows:', n); return p.\$disconnect(); })
 .catch((e) => { console.error('Backfill failed:', e.message); process.exit(1); });
"

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
