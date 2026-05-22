// ============================================================
// SPREADSTER — AI Orchestration Service
// Coordinates: prompt building → Ollama → parsing → validation
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type {
  AIProcessRequest,
  AIProcessResponse,
  InstructionSet,
  SpreadsheetContext,
} from '../types/shared.js';
import { aiProviderService } from './ai-provider.service.js';
import { promptService } from './prompt.service.js';
import { validationService } from './validation.service.js';
import { auditService } from './audit.service.js';
import { logger } from '../lib/logger.js';

const MAX_PARSE_RETRIES = 2;

export const aiService = {
  /**
   * Full AI processing pipeline:
   * 1. (Optional) enhance prompt
   * 2. Build system prompt with spreadsheet context
   * 3. Call Ollama
   * 4. Parse JSON response
   * 5. Validate instruction set
   * 6. Return validated instruction set
   */
  async process(request: AIProcessRequest): Promise<AIProcessResponse> {
    const startTime = Date.now();
    const messageId = uuidv4();
    let model = '';

    try {
      // --- 1. Select provider ---
      const providerInfo = aiProviderService.getActiveInfo();
      model = providerInfo.model ?? 'unknown';
      logger.info({ model, provider: providerInfo.provider, userId: request.userId }, 'Processing AI request');

      // --- 2. Optionally enhance prompt ---
      let finalPrompt = request.prompt;
      let enhancedPrompt: string | undefined;
      if (request.options?.enhancePrompt !== false) {
        try {
          const enhanced = await this.enhancePrompt(request.prompt, request.spreadsheetContext);
          finalPrompt = enhanced.enhancedPrompt;
          enhancedPrompt = enhanced.enhancedPrompt;
        } catch (err) {
          logger.warn({ err }, 'Prompt enhancement failed — using raw prompt');
        }
      }

      // --- 3. Build messages ---
      const systemPrompt = promptService.buildSystemPrompt(
        request.spreadsheetContext,
        process.env['VITE_COLLEGE_NAME'],
      );

      // Load recent conversation history if conversationId provided
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      // (History is loaded by the route handler from DB and could be passed here)

      const messages = promptService.buildConversationMessages(systemPrompt, finalPrompt, history);

      // --- 4. Call Ollama ---
      let rawOutput = '';
      let tokensUsed: number | undefined;
      let attempt = 0;
      let instructionSet: InstructionSet | null = null;

      while (attempt <= MAX_PARSE_RETRIES && !instructionSet) {
        attempt++;
        const response = await aiProviderService.chat(messages, {
          temperature: request.options?.temperature ?? parseFloat(process.env['AI_TEMPERATURE'] ?? '0.1'),
        });

        rawOutput = response.content;
        model = response.model; // update with actual model used
        tokensUsed = response.tokensUsed;

        // --- 5. Parse ---
        instructionSet = validationService.parseAIOutput(rawOutput);

        if (!instructionSet && attempt <= MAX_PARSE_RETRIES) {
          logger.warn({ attempt, rawLength: rawOutput.length }, 'Parse failed — retrying with clarification');
          messages.push({ role: 'assistant', content: rawOutput });
          messages.push({
            role: 'user',
            content: 'Your response was not valid JSON. Please output ONLY a valid JSON object matching the required schema. No prose.',
          });
        }
      }

      if (!instructionSet) {
        await auditService.log({
          type: 'AI_ERROR',
          userId: request.userId,
          spreadsheetId: request.spreadsheetContext.spreadsheetId,
          success: false,
          details: { error: 'Failed to parse AI response after retries', model },
        });
        return {
          success: false,
          conversationId: request.conversationId ?? uuidv4(),
          messageId,
          error: 'The AI did not return a valid instruction set. Please rephrase your request.',
          model,
          latencyMs: Date.now() - startTime,
        };
      }

      // Inject metadata
      instructionSet.id = uuidv4();
      instructionSet.metadata = {
        prompt: request.prompt,
        enhancedPrompt,
        model,
        timestamp: new Date().toISOString(),
        userId: request.userId,
        spreadsheetId: request.spreadsheetContext.spreadsheetId,
        conversationId: request.conversationId,
      };

      // --- 6. Validate ---
      const validation = validationService.validate(instructionSet, request.spreadsheetContext);

      if (!validation.valid) {
        const errorSummary = validation.errors.map((e) => e.message).join('; ');
        logger.warn({ errors: validation.errors }, 'Instruction set validation failed');
        await auditService.log({
          type: 'VALIDATION_FAILED',
          userId: request.userId,
          spreadsheetId: request.spreadsheetContext.spreadsheetId,
          success: false,
          details: { errors: validation.errors, model },
        });
        return {
          success: false,
          conversationId: request.conversationId ?? uuidv4(),
          messageId,
          error: `Validation failed: ${errorSummary}`,
          model,
          latencyMs: Date.now() - startTime,
        };
      }

      const latencyMs = Date.now() - startTime;
      logger.info({ instructionSetId: instructionSet.id, ops: instructionSet.operations.length, latencyMs }, 'AI processing complete');

      await auditService.log({
        type: 'AI_PROCESS',
        userId: request.userId,
        spreadsheetId: request.spreadsheetContext.spreadsheetId,
        instructionSetId: instructionSet.id,
        success: true,
        details: { model, latencyMs, opsCount: instructionSet.operations.length },
      });

      // Build follow-up suggestions
      const suggestions = this.buildSuggestions(instructionSet);

      return {
        success: true,
        conversationId: request.conversationId ?? uuidv4(),
        messageId,
        instructionSet: validation.sanitizedInstructionSet!,
        enhancedPrompt,
        explanation: instructionSet.summary,
        suggestions,
        warnings: validation.warnings.map((w) => w.message),
        model,
        latencyMs,
        tokensUsed,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      logger.error({ err, userId: request.userId }, 'AI processing error');
      await auditService.log({
        type: 'AI_ERROR',
        userId: request.userId,
        spreadsheetId: request.spreadsheetContext.spreadsheetId,
        success: false,
        details: { error: String(err), model },
      });
      return {
        success: false,
        conversationId: request.conversationId ?? uuidv4(),
        messageId,
        error: `AI processing failed: ${String(err)}`,
        model,
        latencyMs,
      };
    }
  },

  /**
   * Enhance a raw user prompt before processing
   */
  async enhancePrompt(
    rawPrompt: string,
    context: SpreadsheetContext,
  ): Promise<{ enhancedPrompt: string; changes: string[] }> {
    const systemMsg = promptService.buildEnhancementPrompt(rawPrompt, context);
    const response = await aiProviderService.chat(
      [{ role: 'user', content: systemMsg }],
      { temperature: 0.2, maxTokens: 512 },
    );

    const parsed = validationService.parseAIOutput(response.content) as {
      enhancedPrompt?: string;
      changes?: string[];
    } | null;

    return {
      enhancedPrompt: parsed?.enhancedPrompt ?? rawPrompt,
      changes: parsed?.changes ?? [],
    };
  },

  buildSuggestions(instructionSet: InstructionSet): string[] {
    const ops = instructionSet.operations.map((o) => o.type);
    const suggestions: string[] = [];

    if (ops.includes('CREATE_SHEET') || ops.includes('SET_VALUES')) {
      suggestions.push('Add data validation rules to this sheet');
      suggestions.push('Create a chart from this data');
      suggestions.push('Apply conditional formatting');
    }
    if (ops.includes('CREATE_CHART')) {
      suggestions.push('Create a pivot table for deeper analysis');
    }
    if (ops.includes('FORMAT_RANGE') || ops.includes('ADD_CONDITIONAL_FORMAT')) {
      suggestions.push('Protect this sheet from accidental edits');
    }

    return suggestions.slice(0, 3);
  },
};
