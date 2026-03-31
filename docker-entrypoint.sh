#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --skip-generate

echo "Seeding database..."
node prisma/compiled/seed.js || echo "Seed skipped (may already be seeded)"

echo "Starting application..."
node server.js
