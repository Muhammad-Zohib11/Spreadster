// ============================================================
// SPREADSTER — Audit Logger (AuditLogger.gs)
// Logs operations to a hidden sheet + backend API
// ============================================================

var AuditLogger = (function() {

  var AUDIT_SHEET_NAME = '_SPREADSTER_AUDIT_';
  var API_URL_KEY = 'SPREADSTER_API_URL';
  var API_KEY_KEY = 'SPREADSTER_API_KEY';

  var AUDIT_HEADERS = [
    'Timestamp', 'Operation', 'Status', 'User', 'BatchId', 'Details', 'Error'
  ];

  function getOrCreateAuditSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(AUDIT_SHEET_NAME);
      sheet.hideSheet();
      sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).setValues([AUDIT_HEADERS]);
      sheet.getRange(1, 1, 1, AUDIT_HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#1e293b')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  /**
   * Log an audit event
   * @param {string} operation - The operation type
   * @param {string} status - 'SUCCESS' | 'FAILED' | 'WARNING'
   * @param {Object} details - Operation details
   * @param {string} [batchId] - Associated batch ID
   * @param {string} [errorMsg] - Error message if failed
   */
  function log(operation, status, details, batchId, errorMsg) {
    try {
      var user = Session.getActiveUser().getEmail() || 'unknown';
      var timestamp = new Date().toISOString();

      // Write to hidden audit sheet
      try {
        var sheet = getOrCreateAuditSheet();
        var detailsStr = details ? JSON.stringify(details) : '';
        // Keep details compact (max 500 chars)
        if (detailsStr.length > 500) detailsStr = detailsStr.substring(0, 500) + '...';
        sheet.appendRow([
          timestamp,
          operation,
          status,
          user,
          batchId || '',
          detailsStr,
          errorMsg || ''
        ]);
      } catch(sheetErr) {
        // Audit sheet write failed — not critical
      }

      // Post to backend API asynchronously (fire & forget using UrlFetchApp)
      var props = PropertiesService.getScriptProperties();
      var apiUrl = props.getProperty(API_URL_KEY);
      var apiKey = props.getProperty(API_KEY_KEY);

      if (apiUrl && apiKey) {
        try {
          var payload = JSON.stringify({
            eventType: operation,
            status: status,
            userId: user,
            spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
            batchId: batchId || null,
            details: details || {},
            error: errorMsg || null,
            timestamp: timestamp
          });

          UrlFetchApp.fetch(apiUrl + '/api/audit/log', {
            method: 'POST',
            contentType: 'application/json',
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json'
            },
            payload: payload,
            muteHttpExceptions: true
          });
        } catch(apiErr) {
          // API log failed — not critical
        }
      }
    } catch(e) {
      // Audit failure must never break execution
    }
  }

  /**
   * Get recent audit entries from the hidden sheet
   */
  function getRecentLogs(limit) {
    try {
      var sheet = getOrCreateAuditSheet();
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) return [];
      var rowCount = Math.min(lastRow - 1, limit || 50);
      var startRow = lastRow - rowCount + 1;
      var data = sheet.getRange(startRow, 1, rowCount, AUDIT_HEADERS.length).getValues();
      return data.map(function(row) {
        return {
          timestamp: row[0],
          operation: row[1],
          status: row[2],
          user: row[3],
          batchId: row[4],
          details: row[5],
          error: row[6]
        };
      }).reverse();
    } catch(e) {
      return [];
    }
  }

  return {
    log: log,
    getRecentLogs: getRecentLogs
  };

})();
