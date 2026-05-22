// ============================================================
// SPREADSTER — Google Apps Script Main Entry (Code.gs)
// Handles menu creation, sidebar, and GAS-callable functions
// ============================================================

var SPREADSTER_VERSION = '1.0.0';
var SIDEBAR_URL = 'https://web-eight-alpha-20.vercel.app'; // Production frontend
var API_KEY = PropertiesService.getScriptProperties().getProperty('SPREADSTER_API_KEY') || '';

// ============================================================
// MENU SETUP
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 SPREADSTER AI')
    .addItem('Open AI Assistant', 'openSidebar')
    .addSeparator()
    .addItem('Quick: Create Report', 'quickCreateReport')
    .addItem('Quick: Clean Data', 'quickCleanData')
    .addItem('Quick: Add Charts', 'quickAddCharts')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Settings')
        .addItem('Configure API Endpoint', 'configureEndpoint')
        .addItem('Set AI Model', 'setAIModel')
        .addItem('View Audit Log', 'viewAuditLog')
    )
    .addSeparator()
    .addItem('About SPREADSTER', 'showAbout')
    .addToUi();
}

function onInstall() {
  onOpen();
}

// ============================================================
// SIDEBAR
// ============================================================

function openSidebar() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle('SPREADSTER AI')
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ============================================================
// CALLABLE FROM REACT (via google.script.run)
// ============================================================

/**
 * Returns full spreadsheet context JSON to the React sidebar
 */
function getSpreadsheetContext() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = ss.getActiveSheet();
  var sheets = ss.getSheets();
  var namedRanges = ss.getNamedRanges();

  var sheetInfos = sheets.map(function(sheet) {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var headers = [];

    if (lastRow > 0 && lastCol > 0) {
      try {
        headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      } catch(e) { /* ignore */ }
    }

    return {
      sheetId: sheet.getSheetId(),
      name: sheet.getName(),
      index: sheet.getIndex() - 1,
      isHidden: sheet.isSheetHidden(),
      tabColor: sheet.getTabColorObject() ? sheet.getTabColorObject().asRgbColor().asHexString() : null,
      frozenRows: sheet.getFrozenRows(),
      frozenColumns: sheet.getFrozenColumns(),
      rowCount: sheet.getMaxRows(),
      columnCount: sheet.getMaxColumns(),
      lastRow: lastRow,
      lastColumn: lastCol,
      hasData: lastRow > 0 && lastCol > 0,
      headers: headers
    };
  });

  var namedRangeInfos = namedRanges.map(function(nr) {
    return {
      name: nr.getName(),
      rangeNotation: nr.getRange().getA1Notation(),
      sheetName: nr.getRange().getSheet().getName()
    };
  });

  // Get 5-row preview of active sheet
  var preview = [];
  if (activeSheet.getLastRow() > 0 && activeSheet.getLastColumn() > 0) {
    try {
      var previewRows = Math.min(activeSheet.getLastRow(), 5);
      preview = activeSheet.getRange(1, 1, previewRows, activeSheet.getLastColumn()).getValues();
    } catch(e) { /* ignore */ }
  }

  return {
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    locale: ss.getSpreadsheetLocale(),
    timeZone: ss.getSpreadsheetTimeZone(),
    owner: ss.getOwner() ? ss.getOwner().getEmail() : null,
    activeSheetName: activeSheet.getName(),
    activeSheetIndex: activeSheet.getIndex() - 1,
    selectedRange: ss.getActiveRange() ? ss.getActiveRange().getA1Notation() : null,
    totalSheets: sheets.length,
    sheets: sheetInfos,
    namedRanges: namedRangeInfos,
    activeSheetPreview: preview
  };
}

/**
 * Execute a full instruction set JSON string
 */
function executeInstructionSet(instructionSetJson) {
  try {
    var instructionSet = JSON.parse(instructionSetJson);
    var result = ExecutionEngine.execute(instructionSet);
    return result;
  } catch(e) {
    return {
      success: false,
      operationsExecuted: 0,
      operationsFailed: 0,
      error: e.toString()
    };
  }
}

/**
 * Apply a rollback snapshot
 */
function applyRollback(snapshotJson) {
  try {
    var snapshot = JSON.parse(snapshotJson);
    RollbackEngine.applySnapshot(snapshot);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Show a toast inside Google Sheets
 */
function showToast(message, title) {
  SpreadsheetApp.getActiveSpreadsheet().toast(
    message,
    title || 'SPREADSTER',
    5
  );
}

// ============================================================
// QUICK ACTION FUNCTIONS (called from menu)
// ============================================================

function quickCreateReport() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt(
    'SPREADSTER — Quick Report',
    'Describe the report to create:',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() === ui.Button.OK) {
    openSidebar();
  }
}

function quickCleanData() {
  openSidebar();
}

function quickAddCharts() {
  openSidebar();
}

// ============================================================
// SETTINGS
// ============================================================

function configureEndpoint() {
  var ui = SpreadsheetApp.getUi();
  var current = PropertiesService.getScriptProperties().getProperty('SPREADSTER_API_URL') || '';
  var result = ui.prompt(
    'Configure API Endpoint',
    'Enter your SPREADSTER backend URL (e.g. https://your-backend.vercel.app):',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() === SpreadsheetApp.getUi().Button.OK) {
    var url = result.getResponseText().trim();
    if (url) {
      PropertiesService.getScriptProperties().setProperty('SPREADSTER_API_URL', url);
      ui.alert('✅ API endpoint saved: ' + url);
    }
  }
}

function setAIModel() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt(
    'Set AI Model',
    'Enter Ollama model name (e.g. deepseek-coder:6.7b, qwen2.5-coder:7b):',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() === ui.Button.OK) {
    var model = result.getResponseText().trim();
    if (model) {
      PropertiesService.getScriptProperties().setProperty('SPREADSTER_AI_MODEL', model);
      ui.alert('✅ AI model set to: ' + model);
    }
  }
}

function viewAuditLog() {
  SpreadsheetApp.getUi().alert('Audit log available at your SPREADSTER backend dashboard.');
}

function showAbout() {
  SpreadsheetApp.getUi().alert(
    'SPREADSTER v' + SPREADSTER_VERSION + '\n\n' +
    'AI-Powered Google Sheets Operating System\n' +
    'College Administration Internal Platform\n\n' +
    'Powered by: Ollama + Open-Source AI\n' +
    'Infrastructure: 100% Free & Private'
  );
}

// ============================================================
// TRIGGER AUTOMATION HANDLER
// (Installed triggers call this)
// ============================================================

function onEditTrigger(e) {
  // Trigger automation functions registered by AutomationEngine
  AutomationEngine.handleOnEdit(e);
}

function onFormSubmitTrigger(e) {
  AutomationEngine.handleOnFormSubmit(e);
}

function onTimeDrivenTrigger() {
  AutomationEngine.handleTimeDriven();
}
