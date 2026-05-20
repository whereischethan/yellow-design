#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy || echo "Warning: migrations failed"
echo "Starting Yellow API..."
exec node dist/index.js
