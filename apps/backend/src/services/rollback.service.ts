// ============================================================
// SPREADSTER — Rollback Service
// Manages spreadsheet checkpoints and rollback operations
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type { Checkpoint } from '@spreadster/shared';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

// Checkpoints expire after 24 hours by default
const CHECKPOINT_TTL_HOURS = parseInt(process.env['CHECKPOINT_TTL_HOURS'] ?? '24', 10);

export const rollbackService = {
  /**
   * Save a checkpoint (called by GAS before executing operations)
   */
  async saveCheckpoint(
    checkpoint: Omit<Checkpoint, 'id'> & { userId: string; batchId?: string },
  ): Promise<string> {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + CHECKPOINT_TTL_HOURS * 3_600_000);

    await prisma.checkpoint.create({
      data: {
        id,
        userId: checkpoint.userId,
        batchId: checkpoint.batchId,
        spreadsheetId: checkpoint.spreadsheetId,
        description: checkpoint.description,
        snapshot: checkpoint.sheets as object[],
        expiresAt,
      },
    });

    logger.info({ checkpointId: id, spreadsheetId: checkpoint.spreadsheetId }, 'Checkpoint saved');
    return id;
  },

  /**
   * Retrieve a checkpoint by ID (for sending back to GAS)
   */
  async getCheckpoint(checkpointId: string, userId: string) {
    const checkpoint = await prisma.checkpoint.findFirst({
      where: { id: checkpointId, userId },
    });

    if (!checkpoint) return null;
    if (checkpoint.expiresAt < new Date()) {
      logger.warn({ checkpointId }, 'Checkpoint has expired');
      return null;
    }

    return checkpoint;
  },

  /**
   * List available rollback points for a spreadsheet
   */
  async listForSpreadsheet(spreadsheetId: string, userId: string, limit = 20) {
    return prisma.checkpoint.findMany({
      where: {
        spreadsheetId,
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        description: true,
        createdAt: true,
        expiresAt: true,
        batchId: true,
      },
    });
  },

  /**
   * Mark an operation batch as rolled back
   */
  async markBatchRolledBack(batchId: string): Promise<void> {
    await prisma.operationBatch.update({
      where: { id: batchId },
      data: {
        status: 'ROLLED_BACK',
        rolledBackAt: new Date(),
      },
    });
  },

  /**
   * Purge expired checkpoints (run as a scheduled task)
   */
  async purgeExpired(): Promise<number> {
    const result = await prisma.checkpoint.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    logger.info({ count: result.count }, 'Purged expired checkpoints');
    return result.count;
  },
};
