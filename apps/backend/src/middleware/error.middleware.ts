// ============================================================
// SPREADSTER — Error Handler Middleware
// ============================================================
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  const status =
    err.name === 'UnauthorizedError' ? 401
    : err.name === 'ForbiddenError' ? 403
    : err.message.startsWith('CORS') ? 403
    : 500;

  res.status(status).json({
    success: false,
    error: process.env['NODE_ENV'] === 'production'
      ? 'An internal error occurred'
      : err.message,
  });
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
}
