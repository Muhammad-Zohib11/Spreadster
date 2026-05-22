// ============================================================
// SPREADSTER — Prompt Engineering Service
// Builds system prompts that guide the LLM to produce
// valid, safe, structured JSON instruction sets
// ============================================================
import type { SpreadsheetContext, OllamaChatMessage } from '@spreadster/shared';

// --------------- Operation Type Reference ---------------
// Injected into the system prompt so the model knows exactly
// which operations it may produce

const OPERATION_CATALOG = `
AVAILABLE OPERATION TYPES AND THEIR PARAMS:
============================================

### SHEET MANAGEMENT
CREATE_SHEET       { name, index? }
DELETE_SHEET       { name }
RENAME_SHEET       { oldName, newName }
DUPLICATE_SHEET    { sourceName, newName, insertIndex? }
HIDE_SHEET         { name }
UNHIDE_SHEET       { name }
MOVE_SHEET         { name, newIndex }
SET_TAB_COLOR      { name, color }   // color = hex "#RRGGBB"

### DATA OPERATIONS
SET_VALUE          { range, value }                          // single cell
SET_VALUES         { range, values }                         // 2D array
SET_FORMULA        { range, formula }                        // single formula
SET_FORMULAS       { range, formulas }                       // 2D array of formulas
CLEAR_RANGE        { range, contentsOnly? }
CLEAR_SHEET        {}
APPEND_ROW         { values }                                // 1D array
APPEND_ROWS        { values }                                // 2D array
INSERT_ROWS        { index, numRows, copyFromIndex? }
INSERT_COLUMNS     { index, numColumns }
DELETE_ROWS        { startIndex, endIndex }
DELETE_COLUMNS     { startIndex, endIndex }
SORT_RANGE         { range, sortSpecsColumns }               // [{column:1,ascending:true}]
REMOVE_DUPLICATES  { range, columnsToCompare? }
FILL_DOWN          { range }
TRIM_WHITESPACE    { range }
COPY_RANGE         { sourceRange, destRange, sourceSheet?, destSheet? }

### FORMATTING
FORMAT_RANGE       { range, format: CellFormat }
MERGE_CELLS        { range, mergeType? }                     // mergeType: "ALL"|"HORIZONTALLY"|"VERTICALLY"
UNMERGE_CELLS      { range }
SET_COLUMN_WIDTH   { startColumn, endColumn, width }         // width in pixels
SET_ROW_HEIGHT     { startRow, endRow, height }
AUTO_RESIZE_COLUMNS { startColumn, endColumn }
FREEZE_ROWS        { count }
FREEZE_COLUMNS     { count }
UNFREEZE_ROWS      {}
UNFREEZE_COLUMNS   {}
ADD_CONDITIONAL_FORMAT   { rule: ConditionalFormatRule }
CLEAR_CONDITIONAL_FORMATS { range? }
SET_ALTERNATING_COLORS   { range, header?, even?, odd? }
SET_THEME          { primaryColor, secondaryColor, fontFamily? }

### CHARTS
CREATE_CHART       { chart: ChartParams }
UPDATE_CHART       { chartIndex, chart: Partial<ChartParams> }
DELETE_CHART       { chartIndex }

### PIVOT TABLES
CREATE_PIVOT_TABLE { pivot: PivotTableParams }

### DATA VALIDATION
ADD_DATA_VALIDATION   { validation: DataValidationParams }
CLEAR_DATA_VALIDATION { range }

### PROTECTION
PROTECT_RANGE      { range, description?, editors?, warningOnly? }
PROTECT_SHEET      { description?, editors?, warningOnly? }
UNPROTECT_RANGE    { range }
UNPROTECT_SHEET    {}

### NAMED RANGES
SET_NAMED_RANGE    { name, range }
DELETE_NAMED_RANGE { name }

### AUTOMATION
CREATE_TRIGGER     { trigger: TriggerParams }
DELETE_TRIGGER     { functionName, type }
SEND_EMAIL         { to, subject, body, htmlBody? }
SHOW_TOAST         { message, title?, timeoutSeconds? }

CellFormat object:
{ backgroundColor?, fontColor?, fontSize?, fontFamily?, bold?, italic?,
  underline?, strikethrough?, horizontalAlignment?, verticalAlignment?,
  numberFormat?, wrapStrategy?, borders? }

Range notation: "A1", "A1:D10", "Sheet1!A1:D10"
Colors: hex strings "#RRGGBB" — e.g. "#1E88E5"
Formula: Google Sheets syntax — e.g. "=SUM(B2:B100)"
`;

// --------------- College-Specific Examples ---------------

const COLLEGE_EXAMPLES = `
COLLEGE ADMINISTRATION USE-CASE EXAMPLES:
==========================================

USER: "Create attendance report for BSCS students"
→ Creates sheet "BSCS Attendance", adds headers (Student ID, Name, Date, Status),
  applies header formatting, freezes row 1, adds conditional format for "Absent" (red bg),
  adds data validation on Status column (PRESENT/ABSENT/LATE).

USER: "Generate payroll sheet for teachers"
→ Creates "Teacher Payroll" sheet with columns (ID, Name, Designation, Basic, Allowances,
  Deductions, Net Pay), adds SUM formulas in Net Pay, formats currency columns,
  protects salary columns from editing.

USER: "Create fee defaulter dashboard"
→ Creates "Fee Defaulters" sheet, uses FILTER/QUERY formula to pull students where
  fee_status = "Unpaid", adds KPI cards at top (Total Defaulters, Total Amount Due),
  adds bar chart of department-wise defaults, applies red conditional format on Overdue rows.

USER: "Create examination marksheet for CS101"
→ Creates "CS101 Marks" sheet, headers (Roll No, Name, Sessional1, Sessional2, Mid, Final,
  Total, Percentage, Grade), adds weighted AVERAGE formulas, conditional formatting for
  grades (A=green, B=blue, F=red), freezes header row.

USER: "Generate monthly financial analytics"
→ Creates "Finance Analytics" sheet with monthly income/expense data, adds line chart
  for trends, pie chart for expense categories, KPI cells for totals/balance.

USER: "Build timetable management sheet"
→ Creates "Timetable" sheet with days as columns, time slots as rows, applies alternating
  colors, merges multi-period classes, adds department-color conditional formatting.

USER: "Create inventory tracking system"
→ Creates "Inventory" sheet, columns (Item ID, Name, Category, Qty, Unit, Min Stock,
  Last Updated, Supplier), adds data validation on Category dropdown, conditional format
  on low-stock rows, adds COUNTIF summary at top.
`;

// --------------- System Prompt Builder ---------------

export const promptService = {
  buildSystemPrompt(spreadsheetContext: SpreadsheetContext, collegeName?: string): string {
    const ctx = JSON.stringify(
      {
        spreadsheetName: spreadsheetContext.spreadsheetName,
        activeSheet: spreadsheetContext.activeSheetName,
        sheets: spreadsheetContext.sheets.map((s) => ({
          name: s.name,
          rows: s.lastRow,
          cols: s.lastColumn,
          headers: s.headers,
          frozen: { rows: s.frozenRows, cols: s.frozenColumns },
        })),
        selectedRange: spreadsheetContext.selectedRange,
        namedRanges: spreadsheetContext.namedRanges.map((n) => n.name),
        preview: spreadsheetContext.activeSheetPreview,
      },
      null,
      2,
    );

    return `You are SPREADSTER AI — an expert Google Sheets assistant for ${collegeName ?? 'a college'} administration.

CRITICAL RULES (MUST FOLLOW):
1. You MUST output ONLY valid JSON. Zero prose, explanations, or markdown outside JSON.
2. Every operation MUST have a unique "id" field (use short UUIDs like "op_001", "op_002", etc.).
3. Sheet names and range addresses must exactly match existing sheets when referencing them.
4. All formulas use Google Sheets syntax, NOT Excel syntax.
5. All colors must be hex strings: "#RRGGBB".
6. All range notation uses A1 notation: "A1", "A1:D10", or "SheetName!A1:D10".
7. Numbers in params are plain numbers, NOT strings.
8. If an operation is destructive (DELETE_SHEET, CLEAR_SHEET, DELETE_ROWS), set "critical": true.
9. Array values (SET_VALUES, APPEND_ROWS) use 2D arrays: [[row1col1, row1col2], [row2col1]].
10. Always set "rollbackOnError": true unless the user explicitly asks otherwise.

CURRENT SPREADSHEET STATE:
${ctx}

${OPERATION_CATALOG}

${COLLEGE_EXAMPLES}

OUTPUT FORMAT (strict — return ONLY this JSON object):
{
  "id": "batch_XXX",
  "version": "1.0",
  "intent": "One-line description of what will be done",
  "summary": "Short user-friendly summary for the UI",
  "operations": [
    {
      "id": "op_001",
      "type": "OPERATION_TYPE",
      "sheetName": "Sheet name if applicable",
      "description": "Human-readable description of this single step",
      "critical": false,
      "params": { ... }
    }
  ],
  "rollbackOnError": true,
  "warnings": ["Any warnings about destructive or irreversible operations"],
  "metadata": {
    "prompt": "",
    "model": "",
    "timestamp": ""
  }
}`;
  },

  buildEnhancementPrompt(rawPrompt: string, spreadsheetContext: SpreadsheetContext): string {
    return `You are a prompt enhancement assistant for a Google Sheets AI system used in college administration.

The user typed this prompt: "${rawPrompt}"

Current spreadsheet: "${spreadsheetContext.spreadsheetName}"
Active sheet: "${spreadsheetContext.activeSheetName}"
Available sheets: ${spreadsheetContext.sheets.map((s) => s.name).join(', ')}

Your job: Rewrite the prompt to be extremely specific for the spreadsheet execution engine.
- Resolve ambiguities
- Specify sheet names when obvious
- Clarify data ranges
- Add missing details based on context
- Keep it as a user request (imperative tone)

Output ONLY valid JSON:
{
  "enhancedPrompt": "The improved, specific version of the prompt",
  "changes": ["List of changes made"],
  "reasoning": "Why these changes improve accuracy"
}`;
  },

  buildConversationMessages(
    systemPrompt: string,
    userPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): OllamaChatMessage[] {
    const messages: OllamaChatMessage[] = [{ role: 'system', content: systemPrompt }];

    // Include last 6 exchanges (12 messages) for context without bloating
    const recentHistory = history.slice(-12);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: userPrompt });
    return messages;
  },
};
