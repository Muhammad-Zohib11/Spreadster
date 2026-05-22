// ============================================================
// SPREADSTER — Audit Service
// Persistent audit logging for all system events
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type { AuditEvent } from '../types/shared.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export const auditService = {
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          type: event.type as Parameters<typeof prisma.auditLog.create>[0]['data']['type'],
          userId: event.userId,
          spreadsheetId: event.spreadsheetId,
          instructionSetId: event.instructionSetId,
          executionId: event.executionId,
          success: event.success,
          details: event.details ?? {},
          ipAddress: event.ip,
          userAgent: event.userAgent,
          timestamp: new Date(),
        },
      });
    } catch (err) {
      // Audit log failures must NEVER crash the main flow
      logger.error({ err, event }, 'Failed to write audit log');
    }
  },

  async getForUser(
    userId: string,
    limit = 50,
    offset = 0,
  ) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });
  },

  async getForSpreadsheet(spreadsheetId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { spreadsheetId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  },

  async getAll(limit = 100, offset = 0) {
    return prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: { user: { select: { name: true, email: true, role: true } } },
    });
  },
};
