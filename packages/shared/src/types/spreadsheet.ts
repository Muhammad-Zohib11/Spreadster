// ============================================================
// SPREADSTER — Spreadsheet Context Types
// Structures describing the current state of a Google Sheets
// workbook — sent by GAS to the backend for AI context
// ============================================================

export interface CellAddress {
  row: number;      // 1-based
  column: number;   // 1-based
  a1: string;       // e.g. "C5"
}

export interface CellInfo {
  address: string;
  value: string | number | boolean | null;
  formula?: string;
  formattedValue?: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'empty';
}

export interface ColumnInfo {
  index: number;    // 1-based
  letter: string;   // e.g. "A", "B", "AA"
  header?: string;
  width?: number;
  dataType?: string;
  sampleValues?: (string | number | boolean | null)[];
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
  columnInfo?: ColumnInfo[];
  namedRanges?: NamedRangeInfo[];
  protectedRanges?: ProtectedRangeInfo[];
  conditionalFormats?: number;
  charts?: number;
  pivotTables?: number;
  triggers?: number;
}

export interface NamedRangeInfo {
  name: string;
  rangeNotation: string;
  sheetName: string;
}

export interface ProtectedRangeInfo {
  rangeNotation: string;
  description?: string;
  editors?: string[];
  warningOnly: boolean;
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
  formulas?: FormulaInfo[];
  lastModified?: string;
  /** Truncated 5-row preview of active sheet data */
  activeSheetPreview?: (string | number | boolean | null)[][];
}

export interface FormulaInfo {
  sheetName: string;
  cell: string;
  formula: string;
  dependsOn?: string[];
}

// --------------- Checkpoint / Rollback ---------------

export interface SheetSnapshot {
  sheetName: string;
  data: (string | number | boolean | null)[][];
  formats: unknown;   // raw GAS format object
  formulas: (string | null)[][];
  merges: MergeInfo[];
  frozenRows: number;
  frozenColumns: number;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
}

export interface MergeInfo {
  startRow: number;
  startColumn: number;
  numRows: number;
  numColumns: number;
}

export interface Checkpoint {
  id: string;
  executionId: string;
  spreadsheetId: string;
  timestamp: string;
  sheets: SheetSnapshot[];
  description?: string;
}

// --------------- Session / Conversation State ---------------

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  instructionSetId?: string;
  executionResult?: {
    success: boolean;
    operationsExecuted: number;
    operationsFailed: number;
    summary: string;
  };
}

export interface Conversation {
  id: string;
  spreadsheetId: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  contextSnapshot?: SpreadsheetContext;
}
