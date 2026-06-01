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

# Orphan payment auto-allocation: historical payments that were recorded via
# the old "general payment" PaymentForm before allocations existed have
# supplier_lot_id NULL AND no allocation rows — they are counted in supplier-
# level totals but invisible to per-lot math, producing a discrepancy. This
# step auto-allocates each orphan oldest-lot-first against the supplier's
# outstanding lots, capped at each lot's outstanding to preserve the no-
# overpayment invariant. Idempotent: only acts on payments that already have
# zero allocations. Symmetric handling for client orphans.
echo "Reconciling orphan payments (no allocation, no legacy FK)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function reconcileSupplier() {
  const orphans = await p.supplierPayment.findMany({
    where: { supplierLotId: null, allocations: { none: {} } },
    orderBy: { createdAt: 'asc' },
  });
  let created = 0;
  let unallocatedRemainder = 0;
  for (const op of orphans) {
    let remaining = Number(op.amount);
    const lots = await p.supplierLot.findMany({
      where: { supplierId: op.supplierId },
      orderBy: { createdAt: 'asc' },
    });
    const tx = [];
    let firstLotId = null;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const sum = await p.supplierPaymentAllocation.aggregate({
        where: { supplierLotId: lot.id },
        _sum: { amount: true },
      });
      const paid = Number(sum._sum.amount ?? 0);
      const outstanding = Number(lot.totalCost) - paid;
      if (outstanding <= 0) continue;
      const apply = Math.min(remaining, outstanding);
      tx.push(
        p.supplierPaymentAllocation.create({
          data: { supplierPaymentId: op.id, supplierLotId: lot.id, amount: apply },
        })
      );
      remaining -= apply;
      if (!firstLotId) firstLotId = lot.id;
      created++;
    }
    await p.\$transaction(tx);
    // If exactly one allocation was created, mirror it into the legacy FK so
    // any UI surface still reading supplierLotId stays consistent.
    if (firstLotId && tx.length === 1) {
      await p.supplierPayment.update({
        where: { id: op.id },
        data: { supplierLotId: firstLotId },
      });
    }
    unallocatedRemainder += remaining;
  }
  if (orphans.length > 0) {
    console.log('Supplier orphan payments reconciled:', orphans.length, 'allocations created:', created, 'unallocated residual:', unallocatedRemainder);
  }
}

async function reconcileClient() {
  const orphans = await p.clientPayment.findMany({
    where: { orderId: null, allocations: { none: {} } },
    orderBy: { createdAt: 'asc' },
  });
  let created = 0;
  let unallocatedRemainder = 0;
  for (const op of orphans) {
    let remaining = Number(op.amount);
    const orders = await p.order.findMany({
      where: { clientId: op.clientId, status: { not: 'CANCELLED' } },
      include: { items: { select: { quantityOrdered: true, unitPrice: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const tx = [];
    let firstOrderId = null;
    for (const order of orders) {
      if (remaining <= 0) break;
      const orderTotal = order.items.reduce(
        (s, i) => s + Number(i.quantityOrdered) * Number(i.unitPrice),
        0
      );
      const sum = await p.clientPaymentAllocation.aggregate({
        where: { orderId: order.id },
        _sum: { amount: true },
      });
      const paid = Number(sum._sum.amount ?? 0);
      const outstanding = orderTotal - paid;
      if (outstanding <= 0) continue;
      const apply = Math.min(remaining, outstanding);
      tx.push(
        p.clientPaymentAllocation.create({
          data: { clientPaymentId: op.id, orderId: order.id, amount: apply },
        })
      );
      remaining -= apply;
      if (!firstOrderId) firstOrderId = order.id;
      created++;
    }
    await p.\$transaction(tx);
    if (firstOrderId && tx.length === 1) {
      await p.clientPayment.update({
        where: { id: op.id },
        data: { orderId: firstOrderId },
      });
    }
    unallocatedRemainder += remaining;
  }
  if (orphans.length > 0) {
    console.log('Client orphan payments reconciled:', orphans.length, 'allocations created:', created, 'unallocated residual:', unallocatedRemainder);
  }
}

Promise.resolve()
  .then(reconcileSupplier)
  .then(reconcileClient)
  .then(() => p.\$disconnect())
  .catch((e) => {
    if (/relation .* does not exist/i.test(e.message)) {
      console.log('Allocation tables not yet present; skipping orphan reconcile.');
      return p.\$disconnect();
    }
    console.error('Orphan reconcile failed:', e.message);
    process.exit(1);
  });
"

# Idempotent backfill: convert legacy chip sizes like "5mm" / "10mm" into the
# new "<n><s|c>" format. The default suffix is "c" matching the new UI default.
# The Preparation column gets its default (RAW) automatically from the schema,
# so no separate backfill is required there.
echo "Backfilling legacy chip sizes (e.g. 5mm -> 5c) if needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.resolve()
  .then(() =>
    p.\$executeRawUnsafe(
      \"UPDATE production_batches SET chip_size = REGEXP_REPLACE(chip_size, '^(\\\\d+)\\\\s*mm\$', '\\\\1c') WHERE chip_size ~ '^\\\\d+\\\\s*mm\$'\"
    )
  )
  .then((n) => console.log('Production batch chip_size rows backfilled:', n))
  .then(() =>
    p.\$executeRawUnsafe(
      \"UPDATE order_items SET chip_size = REGEXP_REPLACE(chip_size, '^(\\\\d+)\\\\s*mm\$', '\\\\1c') WHERE chip_size ~ '^\\\\d+\\\\s*mm\$'\"
    )
  )
  .then((n) => console.log('Order item chip_size rows backfilled:', n))
  .then(() => p.\$disconnect())
  .catch((e) => {
    console.error('chip_size backfill failed:', e.message);
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
