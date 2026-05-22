// ============================================================
// SPREADSTER — Operations Routes
// POST /api/operations/complete        → Mark batch as executed (called from GAS)
// GET  /api/operations/:batchId        → Get batch details
// GET  /api/operations                 → List batches for user
// POST /api/operations/rollback        → Trigger rollback
// POST /api/operations/checkpoint      → Save checkpoint from GAS
// ============================================================
import { Router, type Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { rollbackService } from '../services/rollback.service.js';
import { auditService } from '../services/audit.service.js';
import { requireAuth, requireApiKey, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../lib/logger.js';

export const operationsRouter = Router();

// ---- POST /api/operations/complete ----
// Called by the GAS execution engine after running operations

operationsRouter.post(
  '/complete',
  requireApiKey,
  [
    body('batchId').isUUID(),
    body('success').isBoolean(),
    body('operationsOk').isInt({ min: 0 }),
    body('operationsFailed').isInt({ min: 0 }),
    body('durationMs').optional().isInt({ min: 0 }),
    body('errorMessage').optional().isString().isLength({ max: 2000 }),
    body('failedAtIndex').optional().isInt({ min: 0 }),
    body('log').optional().isArray(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { batchId, success, operationsOk, operationsFailed, durationMs, errorMessage, failedAtIndex, log } =
      req.body as {
        batchId: string;
        success: boolean;
        operationsOk: number;
        operationsFailed: number;
        durationMs?: number;
        errorMessage?: string;
        failedAtIndex?: number;
        log?: unknown[];
      };

    try {
      const batch = await prisma.operationBatch.update({
        where: { id: batchId },
        data: {
          status: success ? 'SUCCESS' : operationsOk > 0 ? 'PARTIAL_SUCCESS' : 'FAILED',
          operationsOk,
          operationsFailed,
          durationMs,
          errorMessage,
          failedAtIndex,
          completedAt: new Date(),
        },
      });

      // Store individual operation logs if provided
      if (log && Array.isArray(log)) {
        await prisma.operation.createMany({
          data: (log as Array<{ id: string; type: string; status: string; error?: string; duration?: number }>).map((op, i) => ({
            id: op.id,
            batchId,
            sequenceIndex: i,
            type: op.type,
            params: {},
            status: op.status.toUpperCase() as 'SUCCESS' | 'FAILED' | 'SKIPPED',
            errorMessage: op.error,
            durationMs: op.duration,
            executedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      await auditService.log({
        type: 'OPERATION_EXECUTE',
        userId: batch.userId,
        spreadsheetId: batch.spreadsheetId,
        batchId,
        success,
        details: { operationsOk, operationsFailed, durationMs },
      });

      res.json({ success: true });
    } catch (err) {
      logger.error({ err, batchId }, 'Failed to complete operation batch');
      res.status(500).json({ success: false, error: 'Failed to update batch' });
    }
  },
);

// ---- GET /api/operations ----

operationsRouter.get('/', requireApiKey, requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query['limit'] as string ?? '20', 10), 100);
  const offset = parseInt(req.query['offset'] as string ?? '0', 10);

  const batches = await prisma.operationBatch.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      status: true,
      operationsTotal: true,
      operationsOk: true,
      operationsFailed: true,
      promptRaw: true,
      aiModel: true,
      durationMs: true,
      spreadsheetName: true,
      createdAt: true,
      completedAt: true,
    },
  });

  res.json({ success: true, batches });
});

// ---- GET /api/operations/:batchId ----

operationsRouter.get(
  '/:batchId',
  requireApiKey,
  requireAuth,
  param('batchId').isUUID(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const batch = await prisma.operationBatch.findFirst({
      where: { id: req.params['batchId'], userId: req.userId },
      include: { operations: { orderBy: { sequenceIndex: 'asc' } } },
    });

    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }

    res.json({ success: true, batch });
  },
);

// ---- POST /api/operations/rollback ----

operationsRouter.post(
  '/rollback',
  requireApiKey,
  requireAuth,
  [body('checkpointId').isUUID(), body('batchId').optional().isUUID()],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { checkpointId, batchId } = req.body as { checkpointId: string; batchId?: string };

    const checkpoint = await rollbackService.getCheckpoint(checkpointId, req.userId!);
    if (!checkpoint) {
      res.status(404).json({ success: false, error: 'Checkpoint not found or expired' });
      return;
    }

    if (batchId) await rollbackService.markBatchRolledBack(batchId);

    await auditService.log({
      type: 'OPERATION_ROLLBACK',
      userId: req.userId,
      spreadsheetId: checkpoint.spreadsheetId,
      batchId,
      success: true,
      details: { checkpointId },
    });

    // Return the snapshot data so GAS can apply it
    res.json({ success: true, snapshot: checkpoint.snapshot });
  },
);

// ---- POST /api/operations/checkpoint ----
// Called by GAS before executing to save a checkpoint

operationsRouter.post(
  '/checkpoint',
  requireApiKey,
  requireAuth,
  [
    body('spreadsheetId').isString().notEmpty(),
    body('sheets').isArray(),
    body('batchId').optional().isUUID(),
    body('description').optional().isString().isLength({ max: 200 }),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { spreadsheetId, sheets, batchId, description } = req.body as {
      spreadsheetId: string;
      sheets: unknown[];
      batchId?: string;
      description?: string;
    };

    const checkpointId = await rollbackService.saveCheckpoint({
      spreadsheetId,
      sheets: sheets as Parameters<typeof rollbackService.saveCheckpoint>[0]['sheets'],
      userId: req.userId!,
      batchId,
      description,
      executionId: batchId ?? '',
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, checkpointId });
  },
);

// ---- GET /api/operations/checkpoints/list ----

operationsRouter.get('/checkpoints/list', requireApiKey, requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const spreadsheetId = req.query['spreadsheetId'] as string;
  if (!spreadsheetId) {
    res.status(400).json({ success: false, error: 'spreadsheetId required' });
    return;
  }
  const checkpoints = await rollbackService.listForSpreadsheet(spreadsheetId, req.userId!);
  res.json({ success: true, checkpoints });
});
