#!/bin/bash
# $DOOMHOUND — Render Start Script (Supabase/PostgreSQL)
set -e

echo "🐺 $DOOMHOUND starting on Render..."

# Apply pending migrations (creates tables on Supabase)
echo "📦 Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "⚠️ Migration warning (may already be applied)"

# Copy Prisma schema to standalone output so it's accessible at runtime
echo "📋 Copying Prisma schema..."
mkdir -p .next/standalone/prisma
cp -f prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true

# Start the server
echo "🔥 Starting server on port ${PORT:-10000}..."
exec node .next/standalone/server.js
