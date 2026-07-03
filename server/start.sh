#!/bin/sh
set -e
echo "Running database migrations..."
# Pinned: prod image has no local prisma CLI; bare npx would fetch incompatible v7
npx prisma@5.22.0 migrate deploy || echo "Warning: migrations failed"
echo "Starting Yellow API..."
exec node dist/index.js
