// ============================================================
// SPREADSTER — Inlined Shared Types
// (Copied from packages/shared for standalone Vercel deployment)
// ============================================================

// --------------- Operation Types ---------------

export type OperationType =
  | 'CREATE_SHEET' | 'DELETE_SHEET' | 'RENAME_SHEET' | 'DUPLICATE_SHEET'
  | 'HIDE_SHEET' | 'UNHIDE_SHEET' | 'MOVE_SHEET' | 'SET_TAB_COLOR'
  | 'SET_VALUE' | 'SET_VALUES' | 'SET_FORMULA' | 'SET_FORMULAS'
  | 'CLEAR_RANGE' | 'CLEAR_SHEET' | 'COPY_RANGE' | 'MOVE_RANGE'
  | 'APPEND_ROW' | 'APPEND_ROWS' | 'INSERT_ROWS' | 'INSERT_COLUMNS'
  | 'DELETE_ROWS' | 'DELETE_COLUMNS' | 'SORT_RANGE' | 'FILTER_RANGE'
  | 'REMOVE_DUPLICATES' | 'TRIM_WHITESPACE' | 'FILL_DOWN' | 'TRANSPOSE_RANGE'
  | 'FORMAT_RANGE' | 'MERGE_CELLS' | 'UNMERGE_CELLS' | 'AUTO_RESIZE_COLUMNS'
  | 'SET_COLUMN_WIDTH' | 'SET_ROW_HEIGHT' | 'FREEZE_ROWS' | 'FREEZE_COLUMNS'
  | 'UNFREEZE_ROWS' | 'UNFREEZE_COLUMNS' | 'ADD_CONDITIONAL_FORMAT'
  | 'CLEAR_CONDITIONAL_FORMATS' | 'SET_THEME' | 'SET_ALTERNATING_COLORS'
  | 'CREATE_CHART' | 'UPDATE_CHART' | 'DELETE_CHART' | 'MOVE_CHART'
  | 'CREATE_PIVOT_TABLE' | 'UPDATE_PIVOT_TABLE' | 'DELETE_PIVOT_TABLE'
  | 'ADD_DATA_VALIDATION' | 'CLEAR_DATA_VALIDATION'
  | 'PROTECT_RANGE' | 'PROTECT_SHEET' | 'UNPROTECT_RANGE' | 'UNPROTECT_SHEET'
  | 'SET_NAMED_RANGE' | 'DELETE_NAMED_RANGE'
  | 'CREATE_TRIGGER' | 'DELETE_TRIGGER'
  | 'SEND_EMAIL' | 'SHOW_TOAST'
  | 'IMPORT_CSV_DATA' | 'CREATE_PDF_EXPORT_CONFIG';

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

export interface OperationLog {
  id: string;
  type: OperationType;
  status: 'success' | 'error' | 'skipped' | 'rolled_back';
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  instructionSetId: string;
  operationsExecuted: number;
  operationsFailed: number;
  error?: string;
  failedAt?: number;
  log: OperationLog[];
  rollbackId?: string;
  checkpointId?: string;
  duration?: number;
}

// --------------- Spreadsheet Context Types ---------------

export interface CellAddress {
  row: number;
  column: number;
  a1: string;
}

export interface CellInfo {
  address: string;
  value: string | number | boolean | null;
  formula?: string;
  formattedValue?: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'empty';
}

export interface ColumnInfo {
  index: number;
  letter: string;
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
  activeSheetPreview?: (string | number | boolean | null)[][];
}

export interface FormulaInfo {
  sheetName: string;
  cell: string;
  formula: string;
  dependsOn?: string[];
}

export interface SheetSnapshot {
  sheetName: string;
  data: (string | number | boolean | null)[][];
  formats: unknown;
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

// --------------- AI Types ---------------

export interface AIProcessRequest {
  prompt: string;
  conversationId?: string;
  spreadsheetContext: SpreadsheetContext;
  userId: string;
  sessionToken: string;
  options?: {
    model?: string;
    temperature?: number;
    maxRetries?: number;
    dryRun?: boolean;
    enhancePrompt?: boolean;
    safeMode?: boolean;
  };
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

export interface AIEnhanceRequest {
  rawPrompt: string;
  spreadsheetContext: SpreadsheetContext;
  userId: string;
  sessionToken: string;
}

export interface AIEnhanceResponse {
  enhancedPrompt: string;
  changes: string[];
  reasoning: string;
}

export type CollegeRole =
  | 'admin' | 'principal' | 'hod' | 'teacher'
  | 'accounts' | 'registrar' | 'librarian' | 'it_staff';

export interface UserContext {
  userId: string;
  name: string;
  email: string;
  role: CollegeRole;
  department?: string;
  permissions: string[];
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
  details?: {
    format: string;
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_ctx?: number;
    num_predict?: number;
    stop?: string[];
    repeat_penalty?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: OllamaGenerateRequest['options'];
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedInstructionSet?: InstructionSet;
}

export interface ValidationError {
  operationId?: string;
  operationType?: string;
  field?: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  operationId?: string;
  operationType?: string;
  message: string;
  code: string;
}

export type AuditEventType =
  | 'AI_PROCESS' | 'OPERATION_EXECUTE' | 'OPERATION_ROLLBACK'
  | 'USER_LOGIN' | 'USER_LOGOUT' | 'SESSION_CREATED'
  | 'PERMISSION_DENIED' | 'VALIDATION_FAILED' | 'AI_ERROR' | 'SYSTEM_ERROR';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  userId?: string;
  spreadsheetId?: string;
  instructionSetId?: string;
  executionId?: string;
  success: boolean;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export interface PromptContext {
  systemPrompt: string;
  userMessage: string;
  conversationHistory: OllamaChatMessage[];
  spreadsheetContextJson: string;
  operationSchemaJson: string;
}
