#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate

# Only seed on first run (owner account + default product)
mkdir -p /app/data
if [ ! -f /app/data/.seeded ]; then
  echo "First run — seeding database..."
  node prisma/compiled/seed.js && touch /app/data/.seeded
else
  echo "Already seeded, skipping."
fi

echo "Starting application..."
node server.js
