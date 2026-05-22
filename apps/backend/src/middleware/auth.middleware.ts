// ============================================================
// SPREADSTER — Auth Middleware
// JWT validation + API key validation
// ============================================================
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const JWT_SECRET = process.env['JWT_SECRET'] ?? '';
const API_KEY = process.env['API_KEY'] ?? '';

if (!JWT_SECRET) {
  logger.warn('JWT_SECRET is not set — authentication will fail');
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

/**
 * Validates Bearer JWT token from Authorization header
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string; email: string };
    
    // Verify session exists and is not revoked
    const session = await prisma.session.findFirst({
      where: {
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!session) {
      res.status(401).json({ success: false, error: 'Session expired or revoked' });
      return;
    }

    req.userId = payload.sub;
    req.userRole = payload.role;
    req.userEmail = payload.email;

    // Update lastUsedAt asynchronously
    prisma.session.updateMany({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
      data: { lastUsedAt: new Date() },
    }).catch(() => {/* fire and forget */});

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token' });
    } else {
      logger.error({ err }, 'Auth middleware error');
      res.status(500).json({ success: false, error: 'Authentication error' });
    }
  }
}

/**
 * Validates X-API-Key header (used by GAS extension)
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    res.status(401).json({ success: false, error: 'Invalid or missing API key' });
    return;
  }
  next();
}

/**
 * Requires one of the listed roles
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
