// ============================================================
// SPREADSTER — Audit Routes
// GET /api/audit        → List audit events (admin only)
// GET /api/audit/me     → Current user's audit trail
// ============================================================
import { Router, type Response } from 'express';
import { auditService } from '../services/audit.service.js';
import { requireAuth, requireApiKey, requireRole, type AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const auditRouter = Router();

auditRouter.get(
  '/',
  requireApiKey,
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const limit = Math.min(parseInt(req.query['limit'] as string ?? '100', 10), 500);
    const offset = parseInt(req.query['offset'] as string ?? '0', 10);
    const logs = await auditService.getAll(limit, offset);
    res.json({ success: true, logs });
  },
);

auditRouter.get(
  '/me',
  requireApiKey,
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const limit = Math.min(parseInt(req.query['limit'] as string ?? '50', 10), 200);
    const offset = parseInt(req.query['offset'] as string ?? '0', 10);
    const logs = await auditService.getForUser(req.userId!, limit, offset);
    res.json({ success: true, logs });
  },
);
