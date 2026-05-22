// ============================================================
// SPREADSTER — Core Operation Types
// Every possible Google Sheets operation SPREADSTER can perform
// ============================================================

// --------------- Operation Type Enum ---------------

export type OperationType =
  // Sheet Management
  | 'CREATE_SHEET'
  | 'DELETE_SHEET'
  | 'RENAME_SHEET'
  | 'DUPLICATE_SHEET'
  | 'HIDE_SHEET'
  | 'UNHIDE_SHEET'
  | 'MOVE_SHEET'
  | 'SET_TAB_COLOR'
  // Data Operations
  | 'SET_VALUE'
  | 'SET_VALUES'
  | 'SET_FORMULA'
  | 'SET_FORMULAS'
  | 'CLEAR_RANGE'
  | 'CLEAR_SHEET'
  | 'COPY_RANGE'
  | 'MOVE_RANGE'
  | 'APPEND_ROW'
  | 'APPEND_ROWS'
  | 'INSERT_ROWS'
  | 'INSERT_COLUMNS'
  | 'DELETE_ROWS'
  | 'DELETE_COLUMNS'
  | 'SORT_RANGE'
  | 'FILTER_RANGE'
  | 'REMOVE_DUPLICATES'
  | 'TRIM_WHITESPACE'
  | 'FILL_DOWN'
  | 'TRANSPOSE_RANGE'
  // Formatting
  | 'FORMAT_RANGE'
  | 'MERGE_CELLS'
  | 'UNMERGE_CELLS'
  | 'AUTO_RESIZE_COLUMNS'
  | 'SET_COLUMN_WIDTH'
  | 'SET_ROW_HEIGHT'
  | 'FREEZE_ROWS'
  | 'FREEZE_COLUMNS'
  | 'UNFREEZE_ROWS'
  | 'UNFREEZE_COLUMNS'
  | 'ADD_CONDITIONAL_FORMAT'
  | 'CLEAR_CONDITIONAL_FORMATS'
  | 'SET_THEME'
  | 'SET_ALTERNATING_COLORS'
  // Charts
  | 'CREATE_CHART'
  | 'UPDATE_CHART'
  | 'DELETE_CHART'
  | 'MOVE_CHART'
  // Pivot Tables
  | 'CREATE_PIVOT_TABLE'
  | 'UPDATE_PIVOT_TABLE'
  | 'DELETE_PIVOT_TABLE'
  // Data Validation
  | 'ADD_DATA_VALIDATION'
  | 'CLEAR_DATA_VALIDATION'
  // Permissions & Protection
  | 'PROTECT_RANGE'
  | 'PROTECT_SHEET'
  | 'UNPROTECT_RANGE'
  | 'UNPROTECT_SHEET'
  // Named Ranges
  | 'SET_NAMED_RANGE'
  | 'DELETE_NAMED_RANGE'
  // Automation / Triggers
  | 'CREATE_TRIGGER'
  | 'DELETE_TRIGGER'
  // Communication
  | 'SEND_EMAIL'
  | 'SHOW_TOAST'
  // Import / Export
  | 'IMPORT_CSV_DATA'
  | 'CREATE_PDF_EXPORT_CONFIG';

// --------------- Core Operation Interface ---------------

export interface SpreadsheetOperation {
  /** Unique UUID for this operation */
  id: string;
  /** The type of operation to perform */
  type: OperationType;
  /** Target sheet name (optional; uses active sheet if omitted) */
  sheetName?: string;
  /** Human-readable description of what this operation does */
  description?: string;
  /** If true, the entire batch rolls back on this operation's failure */
  critical?: boolean;
  /** Operation-specific parameters */
  params: Record<string, unknown>;
}

// --------------- Formatting Types ---------------

export interface RGBColor {
  red: number;   // 0–1
  green: number; // 0–1
  blue: number;  // 0–1
  alpha?: number;
}

export type HexColor = string; // '#RRGGBB'

export type ColorValue = HexColor | RGBColor;

export type HorizontalAlignment = 'LEFT' | 'CENTER' | 'RIGHT';
export type VerticalAlignment = 'TOP' | 'MIDDLE' | 'BOTTOM';
export type WrapStrategy = 'WRAP' | 'OVERFLOW' | 'CLIP';
export type BorderLineStyle =
  | 'SOLID'
  | 'SOLID_MEDIUM'
  | 'SOLID_THICK'
  | 'DOTTED'
  | 'DASHED'
  | 'DOUBLE'
  | 'NONE';

export interface BorderSide {
  style: BorderLineStyle;
  color?: HexColor;
}

export interface Borders {
  top?: BorderSide;
  bottom?: BorderSide;
  left?: BorderSide;
  right?: BorderSide;
  innerHorizontal?: BorderSide;
  innerVertical?: BorderSide;
}

export interface CellFormat {
  backgroundColor?: HexColor;
  fontColor?: HexColor;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  horizontalAlignment?: HorizontalAlignment;
  verticalAlignment?: VerticalAlignment;
  numberFormat?: string; // e.g. "#,##0.00", "dd/MM/yyyy", "0%"
  wrapStrategy?: WrapStrategy;
  borders?: Borders;
  textRotation?: number; // degrees
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
}

// --------------- Conditional Formatting ---------------

export type ConditionalFormatConditionType =
  | 'CUSTOM_FORMULA'
  | 'NUMBER_LESS'
  | 'NUMBER_LESS_OR_EQUAL'
  | 'NUMBER_GREATER'
  | 'NUMBER_GREATER_OR_EQUAL'
  | 'NUMBER_EQUAL'
  | 'NUMBER_NOT_EQUAL'
  | 'NUMBER_BETWEEN'
  | 'NUMBER_NOT_BETWEEN'
  | 'TEXT_CONTAINS'
  | 'TEXT_NOT_CONTAINS'
  | 'TEXT_STARTS_WITH'
  | 'TEXT_ENDS_WITH'
  | 'TEXT_EQUAL'
  | 'DATE_BEFORE'
  | 'DATE_AFTER'
  | 'DATE_EQUAL'
  | 'DATE_ON_OR_BEFORE'
  | 'DATE_ON_OR_AFTER'
  | 'BLANK'
  | 'NOT_BLANK'
  | 'COLOR_SCALE';

export interface ConditionalFormatCondition {
  type: ConditionalFormatConditionType;
  value?: string | number;
  value2?: string | number; // for BETWEEN
  formula?: string; // for CUSTOM_FORMULA
}

export interface ColorScale {
  minColor: HexColor;
  midColor?: HexColor;
  maxColor: HexColor;
  minType?: 'MIN' | 'NUMBER' | 'PERCENT' | 'PERCENTILE';
  midType?: 'NUMBER' | 'PERCENT' | 'PERCENTILE';
  maxType?: 'MAX' | 'NUMBER' | 'PERCENT' | 'PERCENTILE';
  minValue?: number;
  midValue?: number;
  maxValue?: number;
}

export interface ConditionalFormatRule {
  rangeNotation: string;
  condition: ConditionalFormatCondition;
  format?: CellFormat;
  colorScale?: ColorScale;
  priority?: number;
}

// --------------- Chart Types ---------------

export type ChartType =
  | 'BAR'
  | 'LINE'
  | 'PIE'
  | 'DONUT'
  | 'COLUMN'
  | 'AREA'
  | 'SCATTER'
  | 'COMBO'
  | 'HISTOGRAM'
  | 'CANDLESTICK'
  | 'WATERFALL'
  | 'BUBBLE';

export interface ChartSeriesConfig {
  index: number;
  type?: 'LINE' | 'AREA' | 'BARS' | 'STEPPEDAREA';
  color?: HexColor;
  targetAxisIndex?: 0 | 1;
  lineWidth?: number;
  pointSize?: number;
  labelInLegend?: string;
}

export interface AxisConfig {
  title?: string;
  titleTextStyle?: { bold?: boolean; color?: HexColor; fontSize?: number };
  minValue?: number;
  maxValue?: number;
  format?: string;
  direction?: 1 | -1;
  viewWindow?: { min?: number; max?: number };
}

export interface ChartParams {
  chartType: ChartType;
  title: string;
  dataRanges: string[]; // Multiple data ranges
  position: {
    anchorCell: string; // e.g. "D2"
    offsetX?: number;
    offsetY?: number;
    width?: number;
    height?: number;
  };
  options?: {
    legendPosition?: 'BOTTOM' | 'TOP' | 'LEFT' | 'RIGHT' | 'NONE' | 'LABELED';
    titleTextStyle?: { bold?: boolean; color?: HexColor; fontSize?: number };
    series?: ChartSeriesConfig[];
    hAxis?: AxisConfig;
    vAxis?: AxisConfig;
    vAxes?: Record<number, AxisConfig>;
    colors?: HexColor[];
    isStacked?: boolean | 'percent' | 'absolute';
    smooth?: boolean;
    curveType?: 'none' | 'function';
    pointSize?: number;
    useFirstColumnAsDomain?: boolean;
    headerRow?: boolean;
    backgroundColor?: HexColor;
    chartArea?: { left?: string; top?: string; width?: string; height?: string };
    pieHole?: number; // 0.0–0.9 for donut
    is3D?: boolean;
  };
}

// --------------- Pivot Table ---------------

export type PivotValueSummarizeFunction =
  | 'SUM'
  | 'COUNT'
  | 'AVERAGE'
  | 'MAX'
  | 'MIN'
  | 'MEDIAN'
  | 'COUNT_UNIQUE'
  | 'STDEV'
  | 'STDEVP'
  | 'VAR'
  | 'VARP'
  | 'CUSTOM';

export interface PivotGroupRule {
  sourceColumnOffset: number;
  showTotals?: boolean;
  sortOrder?: 'ASCENDING' | 'DESCENDING';
  valueBucket?: { buckets: Array<{ stringValue?: string; doubleValue?: number }> };
}

export interface PivotValueGroup {
  summarizeFunction: PivotValueSummarizeFunction;
  sourceColumnOffset: number;
  name?: string;
  formula?: string; // for CUSTOM
}

export interface PivotTableParams {
  sourceRange: string; // e.g. "Sheet1!A1:F100"
  destinationCell: string; // e.g. "H2"
  destinationSheet?: string;
  rows: PivotGroupRule[];
  columns: PivotGroupRule[];
  values: PivotValueGroup[];
  includeAllValues?: boolean;
}

// --------------- Data Validation ---------------

export type DataValidationType =
  | 'DROPDOWN'
  | 'DROPDOWN_RANGE'
  | 'NUMBER_BETWEEN'
  | 'NUMBER_EQUAL'
  | 'NUMBER_GREATER'
  | 'NUMBER_LESS'
  | 'NUMBER_NOT_BETWEEN'
  | 'DATE_IS'
  | 'DATE_BEFORE'
  | 'DATE_AFTER'
  | 'DATE_BETWEEN'
  | 'TEXT_CONTAINS'
  | 'TEXT_NOT_CONTAINS'
  | 'TEXT_IS'
  | 'TEXT_IS_EMAIL'
  | 'TEXT_IS_URL'
  | 'CHECKBOX'
  | 'CUSTOM_FORMULA';

export interface DataValidationParams {
  rangeNotation: string;
  type: DataValidationType;
  values?: string[];          // for DROPDOWN
  rangeRef?: string;          // for DROPDOWN_RANGE: "Sheet1!A1:A50"
  number1?: number;           // first number bound
  number2?: number;           // second number bound (for BETWEEN)
  formula?: string;           // for CUSTOM_FORMULA
  checkedValue?: string;      // for CHECKBOX
  uncheckedValue?: string;    // for CHECKBOX
  strict?: boolean;           // reject invalid input
  showDropdown?: boolean;
  helpText?: string;
  errorTitle?: string;
  errorMessage?: string;
}

// --------------- Trigger / Automation ---------------

export type TriggerType =
  | 'ON_OPEN'
  | 'ON_EDIT'
  | 'ON_FORM_SUBMIT'
  | 'ON_CHANGE'
  | 'TIME_DRIVEN_HOURLY'
  | 'TIME_DRIVEN_DAILY'
  | 'TIME_DRIVEN_WEEKLY'
  | 'TIME_DRIVEN_MONTHLY';

export interface TriggerParams {
  functionName: string; // GAS function to call
  type: TriggerType;
  hour?: number;           // for daily/weekly (0–23)
  dayOfWeek?: number;      // for weekly (1=Monday … 7=Sunday)
  dayOfMonth?: number;     // for monthly
  description?: string;
}

// --------------- Instruction Set ---------------

export interface InstructionSet {
  id: string;
  version: '1.0';
  intent: string;
  summary: string;
  operations: SpreadsheetOperation[];
  rollbackOnError: boolean;
  estimatedDuration?: number; // ms
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

// --------------- Execution Results ---------------

export interface OperationLog {
  id: string;
  type: OperationType;
  status: 'success' | 'error' | 'skipped' | 'rolled_back';
  result?: unknown;
  error?: string;
  duration?: number; // ms
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
  duration?: number; // ms
}
