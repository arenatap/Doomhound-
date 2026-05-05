#!/bin/bash
# $DOOMHOUND — Render Start Script (Supabase/PostgreSQL)
set -e

echo "🐺 $DOOMHOUND starting on Render..."

# Copy Prisma schema + migrations to standalone output
echo "📋 Copying Prisma files..."
mkdir -p .next/standalone/prisma
cp -f prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true
cp -rf prisma/migrations .next/standalone/prisma/migrations 2>/dev/null || true

# Push DB schema (creates tables on Supabase if they don't exist)
echo "📦 Syncing database schema..."
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️ DB push warning"

# Start the server
echo "🔥 Starting server on port ${PORT:-10000}..."
exec node .next/standalone/server.js
