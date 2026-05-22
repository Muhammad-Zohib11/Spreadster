// ============================================================
// SPREADSTER — Rate Limiting Middleware
// ============================================================
import rateLimit from 'express-rate-limit';
import { logger } from '../lib/logger.js';

const windowMs = parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '60000', 10);
const maxRequests = parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] ?? '60', 10);
const maxAiRequests = parseInt(process.env['RATE_LIMIT_AI_MAX'] ?? '10', 10);

export const globalRateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — please slow down' },
  handler: (req, res, _next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Global rate limit hit');
    res.status(429).json(options.message);
  },
});

export const aiRateLimiter = rateLimit({
  windowMs,
  max: maxAiRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as { userId?: string }).userId ?? req.ip ?? 'unknown',
  message: { success: false, error: 'AI request rate limit reached — please wait before sending another request' },
  handler: (req, res, _next, options) => {
    logger.warn({ userId: (req as { userId?: string }).userId, ip: req.ip }, 'AI rate limit hit');
    res.status(429).json(options.message);
  },
});
