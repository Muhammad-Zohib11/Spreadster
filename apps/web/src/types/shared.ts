// ============================================================
// SPREADSTER — Shared Types (Frontend)
// ============================================================

export type OperationType = string;

export interface SpreadsheetOperation {
  id: string;
  type: OperationType;
  sheetName?: string;
  description?: string;
  critical?: boolean;
  params: Record<string, unknown>;
}

export interface InstructionSet {
  id: string;
  version: '1.0';
  intent: string;
  summary: string;
  operations: SpreadsheetOperation[];
  rollbackOnError: boolean;
  estimatedDuration?: number;
  warnings?: string[];
  metadata: {
    prompt: string;
    enhancedPrompt?: string;
    model: string;
    timestamp: string;
    userId?: string;
    spreadsheetId?: string;
    conversationId?: string;
  };
}

export interface SheetInfo {
  sheetId: number;
  name: string;
  index: number;
  isHidden: boolean;
  tabColor?: string;
  frozenRows: number;
  frozenColumns: number;
  rowCount: number;
  columnCount: number;
  lastRow: number;
  lastColumn: number;
  hasData: boolean;
  headers?: string[];
}

export interface NamedRangeInfo {
  name: string;
  rangeNotation: string;
  sheetName: string;
}

export interface SpreadsheetContext {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  locale: string;
  timeZone: string;
  owner?: string;
  activeSheetName: string;
  activeSheetIndex: number;
  selectedRange?: string;
  totalSheets: number;
  sheets: SheetInfo[];
  namedRanges: NamedRangeInfo[];
  lastModified?: string;
  activeSheetPreview?: (string | number | boolean | null)[][];
}

export interface AIProcessResponse {
  success: boolean;
  conversationId: string;
  messageId: string;
  instructionSet?: InstructionSet;
  enhancedPrompt?: string;
  explanation?: string;
  suggestions?: string[];
  warnings?: string[];
  error?: string;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
}
