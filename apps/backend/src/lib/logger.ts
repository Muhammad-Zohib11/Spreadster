// ============================================================
// SPREADSTER — Pino Logger
// ============================================================
import pino from 'pino';

const isDev = process.env['NODE_ENV'] !== 'production';

export const logger = pino(
  {
    level: process.env['LOG_LEVEL'] ?? 'info',
    base: { service: 'spreadster-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-api-key"]',
        '*.passwordHash',
        '*.password',
        '*.secret',
        '*.token',
      ],
      remove: true,
    },
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      })
    : undefined,
);
