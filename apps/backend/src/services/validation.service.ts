// ============================================================
// SPREADSTER — Validation Service
// Validates AI-generated InstructionSets before execution
// Prevents hallucinated, corrupt, or dangerous operations
// ============================================================
import { z } from 'zod';
import type { InstructionSet, ValidationResult, SpreadsheetContext } from '@spreadster/shared';
import { logger } from '../lib/logger.js';

// --------------- Zod Schemas ---------------

const colorHexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex #RRGGBB');

const rangeSchema = z
  .string()
  .regex(
    /^([A-Za-z0-9_ ]+!)?[A-Z]+\d+(:[A-Z]+\d+)?$/,
    'Invalid A1 range notation',
  );

const cellFormatSchema = z
  .object({
    backgroundColor: colorHexSchema.optional(),
    fontColor: colorHexSchema.optional(),
    fontSize: z.number().min(6).max(72).optional(),
    fontFamily: z.string().max(64).optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    horizontalAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional(),
    verticalAlignment: z.enum(['TOP', 'MIDDLE', 'BOTTOM']).optional(),
    numberFormat: z.string().max(128).optional(),
    wrapStrategy: z.enum(['WRAP', 'OVERFLOW', 'CLIP']).optional(),
  })
  .strict();

const operationSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.string().min(1),
    sheetName: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    critical: z.boolean().optional(),
    params: z.record(z.unknown()),
  })
  .passthrough();

const instructionSetSchema = z
  .object({
    id: z.string().min(1),
    version: z.literal('1.0'),
    intent: z.string().min(1).max(500),
    summary: z.string().min(1).max(500),
    operations: z.array(operationSchema).min(1).max(200),
    rollbackOnError: z.boolean(),
    warnings: z.array(z.string()).optional(),
    metadata: z.object({
      prompt: z.string(),
      model: z.string(),
      timestamp: z.string(),
      userId: z.string().optional(),
      spreadsheetId: z.string().optional(),
    }),
  })
  .passthrough();

// --------------- Allowed Operations Whitelist ---------------

const ALLOWED_OPERATIONS = new Set([
  'CREATE_SHEET', 'DELETE_SHEET', 'RENAME_SHEET', 'DUPLICATE_SHEET',
  'HIDE_SHEET', 'UNHIDE_SHEET', 'MOVE_SHEET', 'SET_TAB_COLOR',
  'SET_VALUE', 'SET_VALUES', 'SET_FORMULA', 'SET_FORMULAS',
  'CLEAR_RANGE', 'CLEAR_SHEET', 'COPY_RANGE', 'MOVE_RANGE',
  'APPEND_ROW', 'APPEND_ROWS', 'INSERT_ROWS', 'INSERT_COLUMNS',
  'DELETE_ROWS', 'DELETE_COLUMNS', 'SORT_RANGE', 'FILTER_RANGE',
  'REMOVE_DUPLICATES', 'TRIM_WHITESPACE', 'FILL_DOWN', 'TRANSPOSE_RANGE',
  'FORMAT_RANGE', 'MERGE_CELLS', 'UNMERGE_CELLS', 'AUTO_RESIZE_COLUMNS',
  'SET_COLUMN_WIDTH', 'SET_ROW_HEIGHT', 'FREEZE_ROWS', 'FREEZE_COLUMNS',
  'UNFREEZE_ROWS', 'UNFREEZE_COLUMNS', 'ADD_CONDITIONAL_FORMAT',
  'CLEAR_CONDITIONAL_FORMATS', 'SET_THEME', 'SET_ALTERNATING_COLORS',
  'CREATE_CHART', 'UPDATE_CHART', 'DELETE_CHART', 'MOVE_CHART',
  'CREATE_PIVOT_TABLE', 'UPDATE_PIVOT_TABLE', 'DELETE_PIVOT_TABLE',
  'ADD_DATA_VALIDATION', 'CLEAR_DATA_VALIDATION',
  'PROTECT_RANGE', 'PROTECT_SHEET', 'UNPROTECT_RANGE', 'UNPROTECT_SHEET',
  'SET_NAMED_RANGE', 'DELETE_NAMED_RANGE',
  'CREATE_TRIGGER', 'DELETE_TRIGGER', 'SEND_EMAIL', 'SHOW_TOAST',
  'IMPORT_CSV_DATA', 'CREATE_PDF_EXPORT_CONFIG',
]);

// Destructive operations that require an extra warning
const DESTRUCTIVE_OPERATIONS = new Set([
  'DELETE_SHEET', 'CLEAR_SHEET', 'DELETE_ROWS', 'DELETE_COLUMNS',
  'CLEAR_RANGE', 'REMOVE_DUPLICATES', 'UNPROTECT_SHEET', 'UNPROTECT_RANGE',
]);

// Operations that should reference an existing sheet
const SHEET_REF_OPERATIONS = new Set([
  'DELETE_SHEET', 'RENAME_SHEET', 'DUPLICATE_SHEET', 'HIDE_SHEET',
  'UNHIDE_SHEET', 'MOVE_SHEET', 'SET_TAB_COLOR',
]);

// --------------- Formula Safety Check ---------------

const DANGEROUS_FORMULA_PATTERNS = [
  /IMPORTDATA\s*\(/i,
  /IMPORTHTML\s*\(/i,
  /IMPORTXML\s*\(/i,
  /IMPORTFEED\s*\(/i,
  /IMPORTRANGE\s*\(\s*["'][^"']{200,}/i, // unusually long import range
  /GOOGLETRANSLATE\s*\(/i,
  /IMAGE\s*\(\s*["']https?:\/\//i, // external images could leak data
];

function isFormulasSafe(formula: string): boolean {
  return !DANGEROUS_FORMULA_PATTERNS.some((p) => p.test(formula));
}

// --------------- Main Validator ---------------

export const validationService = {
  /**
   * Parse raw AI output string into an InstructionSet
   * Strips any prose/markdown that the model may have added
   */
  parseAIOutput(rawOutput: string): InstructionSet | null {
    let jsonStr = rawOutput.trim();

    // Strip ```json ... ``` or ``` ... ``` wrappers
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

    // Find the outermost JSON object
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    jsonStr = jsonStr.slice(start, end + 1);

    try {
      return JSON.parse(jsonStr) as InstructionSet;
    } catch (err) {
      logger.warn({ err, rawLength: rawOutput.length }, 'Failed to parse AI JSON output');
      return null;
    }
  },

  /**
   * Full validation of an InstructionSet
   */
  validate(
    instructionSet: unknown,
    spreadsheetContext?: SpreadsheetContext,
  ): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // --- Schema validation ---
    const parseResult = instructionSetSchema.safeParse(instructionSet);
    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        errors.push({
          code: 'SCHEMA_INVALID',
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
      return { valid: false, errors, warnings };
    }

    const set = parseResult.data as InstructionSet;
    const existingSheets = new Set(
      spreadsheetContext?.sheets.map((s) => s.name.toLowerCase()) ?? [],
    );

    // --- Per-operation checks ---
    const seenIds = new Set<string>();
    for (const op of set.operations) {
      const opCtx = { operationId: op.id, operationType: op.type };

      // Duplicate ID check
      if (seenIds.has(op.id)) {
        errors.push({ ...opCtx, code: 'DUPLICATE_OP_ID', message: `Duplicate operation id "${op.id}"` });
      }
      seenIds.add(op.id);

      // Whitelist check
      if (!ALLOWED_OPERATIONS.has(op.type)) {
        errors.push({ ...opCtx, code: 'UNKNOWN_OP_TYPE', message: `Unknown operation type "${op.type}"` });
      }

      // Destructive warning
      if (DESTRUCTIVE_OPERATIONS.has(op.type)) {
        warnings.push({ ...opCtx, code: 'DESTRUCTIVE_OP', message: `"${op.type}" is destructive and irreversible without rollback` });
      }

      // Sheet reference check
      if (
        SHEET_REF_OPERATIONS.has(op.type) &&
        op.sheetName &&
        existingSheets.size > 0 &&
        !existingSheets.has(op.sheetName.toLowerCase())
      ) {
        warnings.push({
          ...opCtx,
          code: 'SHEET_NOT_FOUND',
          message: `Sheet "${op.sheetName}" not found in current workbook`,
        });
      }

      // Formula safety
      if (op.type === 'SET_FORMULA' && typeof op.params['formula'] === 'string') {
        if (!isFormulasSafe(op.params['formula'])) {
          errors.push({ ...opCtx, code: 'UNSAFE_FORMULA', message: 'Formula contains potentially unsafe external data import functions' });
        }
      }
      if (op.type === 'SET_FORMULAS' && Array.isArray(op.params['formulas'])) {
        const formulas = (op.params['formulas'] as unknown[][]).flat();
        for (const f of formulas) {
          if (typeof f === 'string' && !isFormulasSafe(f)) {
            errors.push({ ...opCtx, code: 'UNSAFE_FORMULA', message: 'Formula array contains unsafe external data import function' });
            break;
          }
        }
      }

      // Color format checks in FORMAT_RANGE
      if (op.type === 'FORMAT_RANGE' && op.params['format']) {
        const fmt = op.params['format'] as Record<string, unknown>;
        const colorCheck = cellFormatSchema.safeParse(fmt);
        if (!colorCheck.success) {
          warnings.push({ ...opCtx, code: 'FORMAT_PARAMS_WARN', message: colorCheck.error.issues[0]?.message ?? 'Invalid format params' });
        }
      }

      // Range sanity — detect absurdly large ranges that could freeze the sheet
      const range = (op.params['range'] ?? op.params['rangeNotation']) as string | undefined;
      if (range) {
        const match = range.match(/:([A-Z]+)(\d+)$/);
        if (match) {
          const colNum = match[1]!.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
          const rowNum = parseInt(match[2]!, 10);
          if (rowNum > 50_000 || colNum > 50) {
            warnings.push({ ...opCtx, code: 'LARGE_RANGE', message: `Range "${range}" is very large and may be slow` });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedInstructionSet: errors.length === 0 ? set : undefined,
    };
  },
};
