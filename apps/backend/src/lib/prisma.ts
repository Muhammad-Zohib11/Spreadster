// ============================================================
// SPREADSTER — Prisma Client Singleton
// ============================================================
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });

  client.$on('warn', (e) => logger.warn({ msg: e.message }, 'Prisma warning'));
  client.$on('error', (e) => logger.error({ msg: e.message }, 'Prisma error'));

  return client;
}

// Reuse in development to prevent connection exhaustion during hot reload
export const prisma: PrismaClient =
  process.env['NODE_ENV'] === 'production'
    ? createPrismaClient()
    : (globalThis.__prisma ??= createPrismaClient());
