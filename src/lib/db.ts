import { PrismaClient } from '@prisma/client'

// ===== DATABASE_URL SAFETY NET =====
// Prisma with SQLite requires DATABASE_URL to start with "file:" protocol.
// On Render, if the env var is missing or misconfigured, we provide a fallback.
// This prevents the "URL must start with the protocol 'file:'" runtime crash.
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  const fallbackUrl = 'file:./data/doomhound.db';
  console.warn(
    `[DB] DATABASE_URL is missing or invalid (must start with 'file:'). ` +
    `Falling back to: ${fallbackUrl}`
  );
  process.env.DATABASE_URL = fallbackUrl;
}

// Ensure the data directory exists (for standalone builds where it may not exist yet)
// This is a no-op if the directory already exists
import { mkdirSync } from 'fs';
import { dirname } from 'path';
try {
  const dbUrl = process.env.DATABASE_URL;
  // Extract path from file:./path/to/db or file:/absolute/path
  const dbPath = dbUrl.replace(/^file:/, '');
  const dir = dirname(dbPath);
  if (dir && dir !== '.') {
    mkdirSync(dir, { recursive: true });
  }
} catch {
  // Directory creation is best-effort — if it fails, Prisma will show a clear error
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
