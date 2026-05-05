#!/bin/bash
# $DOOMHOUND — Render Start Script
# Runs Prisma DB push at startup (disk is mounted at runtime, not build time)
# Then starts the Next.js standalone server

set -e

echo "🐺 $DOOMHOUND starting on Render..."

# Push DB schema (creates tables if needed — disk is available at runtime)
echo "📦 Syncing database schema..."
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️ DB push warning (may already exist)"

# Copy Prisma schema to standalone output so it's accessible at runtime
echo "📋 Copying Prisma schema..."
mkdir -p .next/standalone/prisma
cp -f prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true

# Start the server
echo "🔥 Starting server on port ${PORT:-10000}..."
exec node .next/standalone/server.js
