#!/bin/sh
set -e

echo "Running database migrations..."

# Pre-migration backfill: the BatchStatus enum no longer includes DISPATCHED.
# Any existing rows in that state would block the enum alteration, so they are
# migrated to COMPLETED first. Idempotent — safe to run when no such rows exist
# and safe to run when the column type has already been altered.
echo "Pre-migration: collapsing DISPATCHED batches into COMPLETED if needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$executeRawUnsafe(
  \"UPDATE production_batches SET status = 'COMPLETED'::\\\"BatchStatus\\\" WHERE status::text = 'DISPATCHED'\"
).then((n) => { console.log('DISPATCHED -> COMPLETED rows updated:', n); return p.\$disconnect(); })
 .catch((e) => {
   // The enum value may already be gone (post-migration restart) — ignore.
   if (/invalid input value for enum|does not exist/i.test(e.message)) {
     console.log('DISPATCHED enum value not present; skipping pre-migration backfill.');
     return p.\$disconnect();
   }
   console.error('DISPATCHED backfill failed:', e.message);
   process.exit(1);
 });
"

npx prisma db push --skip-generate --accept-data-loss

# Idempotent backfill: convert legacy single-FK supplier/client payments into
# one-row entries in the new allocation tables, so the new payment listing UI
# can read them uniformly. Skips payments that already have allocation rows.
echo "Backfilling payment allocations from legacy single-FK rows if needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.resolve()
  .then(() =>
    p.\$executeRawUnsafe(
      \`INSERT INTO supplier_payment_allocations (id, supplier_payment_id, supplier_lot_id, amount)
       SELECT gen_random_uuid(), sp.id, sp.supplier_lot_id, sp.amount
       FROM supplier_payments sp
       WHERE sp.supplier_lot_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM supplier_payment_allocations spa
           WHERE spa.supplier_payment_id = sp.id
         )\`
    )
  )
  .then((n) => console.log('Supplier allocations backfilled:', n))
  .then(() =>
    p.\$executeRawUnsafe(
      \`INSERT INTO client_payment_allocations (id, client_payment_id, order_id, amount)
       SELECT gen_random_uuid(), cp.id, cp.order_id, cp.amount
       FROM client_payments cp
       WHERE cp.order_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM client_payment_allocations cpa
           WHERE cpa.client_payment_id = cp.id
         )\`
    )
  )
  .then((n) => console.log('Client allocations backfilled:', n))
  .then(() => p.\$disconnect())
  .catch((e) => {
    // Tables may not exist yet on a fresh DB before db push — skip silently.
    if (/relation .* does not exist/i.test(e.message)) {
      console.log('Allocation tables not yet present; skipping allocation backfill.');
      return p.\$disconnect();
    }
    console.error('Allocation backfill failed:', e.message);
    process.exit(1);
  });
"

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
