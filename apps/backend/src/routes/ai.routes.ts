// ============================================================
// SPREADSTER — AI Routes
// POST /api/ai/process   → Main AI processing pipeline
// POST /api/ai/enhance   → Prompt enhancement only
// GET  /api/ai/models    → List available Ollama models
// GET  /api/ai/status    → Ollama health check
// ============================================================
import { Router, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { aiService } from '../services/ai.service.js';
import { aiProviderService } from '../services/ai-provider.service.js';
import { requireAuth, requireApiKey, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { aiRateLimiter } from '../middleware/rateLimit.middleware.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export const aiRouter = Router();

// ---- Validation schemas ----

const processValidation = [
  body('prompt').isString().trim().isLength({ min: 1, max: 4000 }).withMessage('Prompt must be 1–4000 characters'),
  body('spreadsheetContext').isObject().withMessage('spreadsheetContext is required'),
  body('spreadsheetContext.spreadsheetId').isString().notEmpty(),
  body('spreadsheetContext.activeSheetName').isString().notEmpty(),
  body('conversationId').optional().isUUID(),
];

// ---- POST /api/ai/process ----

aiRouter.post(
  '/process',
  requireApiKey,
  requireAuth,
  aiRateLimiter,
  ...processValidation,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { prompt, spreadsheetContext, conversationId, options } = req.body as {
      prompt: string;
      spreadsheetContext: Parameters<typeof aiService.process>[0]['spreadsheetContext'];
      conversationId?: string;
      options?: Parameters<typeof aiService.process>[0]['options'];
    };

    // Ensure conversation exists (create if new)
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.conversation.create({
        data: {
          id: uuidv4(),
          userId: req.userId!,
          spreadsheetId: spreadsheetContext.spreadsheetId,
          spreadsheetName: spreadsheetContext.spreadsheetName,
          title: prompt.slice(0, 80),
        },
      });
      convId = conv.id;
    }

    // Store user message
    await prisma.conversationMessage.create({
      data: {
        conversationId: convId,
        role: 'USER',
        content: prompt,
      },
    });

    const result = await aiService.process({
      prompt,
      conversationId: convId,
      spreadsheetContext,
      userId: req.userId!,
      sessionToken: req.headers['authorization']!.slice(7),
      options,
    });

    // Store AI response message
    if (result.instructionSet) {
      const batch = await prisma.operationBatch.create({
        data: {
          id: result.instructionSet.id,
          userId: req.userId!,
          conversationId: convId,
          spreadsheetId: spreadsheetContext.spreadsheetId,
          spreadsheetName: spreadsheetContext.spreadsheetName,
          instructionSet: result.instructionSet as object,
          status: 'PENDING',
          operationsTotal: result.instructionSet.operations.length,
          promptRaw: prompt,
          promptEnhanced: result.enhancedPrompt,
          aiModel: result.model,
          aiLatencyMs: result.latencyMs,
          tokensUsed: result.tokensUsed,
        },
      });

      await prisma.conversationMessage.create({
        data: {
          conversationId: convId,
          role: 'ASSISTANT',
          content: result.explanation ?? result.instructionSet.summary,
          instructionSetId: result.instructionSet.id,
          operationBatchId: batch.id,
        },
      });
    }

    res.json({ ...result, conversationId: convId });
  },
);

// ---- POST /api/ai/enhance ----

aiRouter.post(
  '/enhance',
  requireApiKey,
  requireAuth,
  [
    body('rawPrompt').isString().trim().isLength({ min: 1, max: 2000 }),
    body('spreadsheetContext').isObject(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const result = await aiService.enhancePrompt(
        req.body.rawPrompt as string,
        req.body.spreadsheetContext as Parameters<typeof aiService.enhancePrompt>[1],
      );
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error({ err }, 'Prompt enhancement error');
      res.status(500).json({ success: false, error: 'Enhancement failed' });
    }
  },
);

// ---- GET /api/ai/models ----

aiRouter.get('/models', requireApiKey, async (_req, res: Response): Promise<void> => {
  const { availableProviders, provider, model } = aiProviderService.getActiveInfo();
  res.json({
    aiOnline: availableProviders.length > 0,
    activeProvider: provider,
    activeModel: model,
    availableProviders,
    models: availableProviders.map((p) => ({ provider: p })),
  });
});

// ---- GET /api/ai/status ----

aiRouter.get('/status', requireApiKey, async (_req, res: Response): Promise<void> => {
  const { availableProviders, provider, model } = aiProviderService.getActiveInfo();
  res.json({
    // keep ollamaOnline for backwards compatibility with frontend
    ollamaOnline: availableProviders.length > 0,
    aiOnline: availableProviders.length > 0,
    activeProvider: provider,
    selectedModel: model,
    availableProviders,
  });
});
