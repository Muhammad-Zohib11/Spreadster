// ============================================================
// SPREADSTER — Rollback Engine (RollbackEngine.gs)
// Creates full sheet snapshots and restores them
// ============================================================

var RollbackEngine = (function() {

  var CHECKPOINT_CACHE_KEY_PREFIX = 'SPREADSTER_CKPT_';
  var MAX_CHECKPOINTS = 10;

  /**
   * Create a full snapshot of all sheets in the active spreadsheet
   */
  function createCheckpoint(batchId, description) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();

    var sheetSnapshots = sheets.map(function(sheet) {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();

      var values = [];
      var formulas = [];
      var formats = [];
      var backgrounds = [];
      var fontColors = [];
      var fontWeights = [];
      var fontStyles = [];
      var numberFormats = [];
      var merges = [];
      var conditionalFormats = [];
      var rowHeights = [];
      var colWidths = [];

      if (lastRow > 0 && lastCol > 0) {
        var dataRange = sheet.getRange(1, 1, lastRow, lastCol);
        values = dataRange.getValues();
        formulas = dataRange.getFormulas();
        formats = dataRange.getNumberFormats();
        backgrounds = dataRange.getBackgrounds();
        fontColors = dataRange.getFontColors();
        fontWeights = dataRange.getFontWeights();
        fontStyles = dataRange.getFontStyles();
        numberFormats = formats;
        merges = sheet.getMergedRanges().map(function(r) {
          return r.getA1Notation();
        });
      }

      // Capture conditional format rules
      sheet.getConditionalFormatRules().forEach(function(rule) {
        conditionalFormats.push({
          ranges: rule.getRanges().map(function(r) { return r.getA1Notation(); })
        });
      });

      return {
        sheetId: sheet.getSheetId(),
        name: sheet.getName(),
        index: sheet.getIndex(),
        isHidden: sheet.isSheetHidden(),
        frozenRows: sheet.getFrozenRows(),
        frozenColumns: sheet.getFrozenColumns(),
        tabColor: sheet.getTabColorObject() ? sheet.getTabColorObject().asRgbColor().asHexString() : null,
        lastRow: lastRow,
        lastColumn: lastCol,
        values: values,
        formulas: formulas,
        backgrounds: backgrounds,
        fontColors: fontColors,
        fontWeights: fontWeights,
        fontStyles: fontStyles,
        numberFormats: numberFormats,
        merges: merges
      };
    });

    var checkpoint = {
      id: 'ckpt_' + Date.now() + '_' + (batchId || 'manual'),
      batchId: batchId,
      description: description || 'Manual checkpoint',
      spreadsheetId: ss.getId(),
      createdAt: new Date().toISOString(),
      snapshot: {
        sheets: sheetSnapshots
      }
    };

    // Store in Script Cache (max 6h, 100KB limit per entry)
    // For large sheets, store in Script Properties as fallback
    try {
      var cache = CacheService.getScriptCache();
      var json = JSON.stringify(checkpoint);
      if (json.length < 90000) { // stay under 100KB
        cache.put(CHECKPOINT_CACHE_KEY_PREFIX + checkpoint.id, json, 21600);
      } else {
        // Store in Script Properties (max 500KB per key)
        var props = PropertiesService.getScriptProperties();
        props.setProperty(CHECKPOINT_CACHE_KEY_PREFIX + checkpoint.id, json);
      }

      // Track checkpoint list
      var listJson = CacheService.getScriptCache().get('SPREADSTER_CKPT_LIST') || '[]';
      var list = JSON.parse(listJson);
      list.push(checkpoint.id);
      if (list.length > MAX_CHECKPOINTS) {
        list = list.slice(-MAX_CHECKPOINTS);
      }
      cache.put('SPREADSTER_CKPT_LIST', JSON.stringify(list), 21600);
    } catch(e) {
      // Non-critical — checkpoint storage failed but execution continues
      AuditLogger.log('CHECKPOINT_SAVE_FAILED', 'WARNING', { error: e.toString() });
    }

    return checkpoint;
  }

  /**
   * Apply a full snapshot — restores all sheet data, formats, and structure
   */
  function applySnapshot(snapshot) {
    if (!snapshot || !snapshot.sheets) {
      throw new Error('Invalid snapshot: missing sheets array');
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    snapshot.sheets.forEach(function(sheetSnap) {
      var sheet = ss.getSheetByName(sheetSnap.name);
      if (!sheet) {
        sheet = ss.insertSheet(sheetSnap.name);
      }

      // Restore data and formulas
      if (sheetSnap.lastRow > 0 && sheetSnap.lastColumn > 0) {
        var range = sheet.getRange(1, 1, sheetSnap.lastRow, sheetSnap.lastColumn);

        // Restore formulas first, then overwrite cells without formulas with values
        if (sheetSnap.formulas && sheetSnap.formulas.length > 0) {
          range.setFormulas(sheetSnap.formulas);
        }
        if (sheetSnap.values && sheetSnap.values.length > 0) {
          // Only set value where formula is blank
          var mixed = sheetSnap.values.map(function(row, ri) {
            return row.map(function(cell, ci) {
              var formula = sheetSnap.formulas && sheetSnap.formulas[ri] ? sheetSnap.formulas[ri][ci] : '';
              return formula ? '' : cell;
            });
          });
          range.setValues(mixed);
        }

        // Restore formatting
        if (sheetSnap.backgrounds) range.setBackgrounds(sheetSnap.backgrounds);
        if (sheetSnap.fontColors) range.setFontColors(sheetSnap.fontColors);
        if (sheetSnap.fontWeights) range.setFontWeights(sheetSnap.fontWeights);
        if (sheetSnap.fontStyles) range.setFontStyles(sheetSnap.fontStyles);
        if (sheetSnap.numberFormats) range.setNumberFormats(sheetSnap.numberFormats);
      }

      // Restore frozen rows/cols
      sheet.setFrozenRows(sheetSnap.frozenRows || 0);
      sheet.setFrozenColumns(sheetSnap.frozenColumns || 0);

      // Restore visibility
      if (sheetSnap.isHidden) {
        sheet.hideSheet();
      } else {
        sheet.showSheet();
      }

      // Restore tab color
      if (sheetSnap.tabColor) {
        sheet.setTabColor(sheetSnap.tabColor);
      }
    });

    SpreadsheetApp.flush();
    AuditLogger.log('ROLLBACK_APPLIED', 'SUCCESS', { sheetCount: snapshot.sheets.length });
  }

  /**
   * Get a stored checkpoint by ID
   */
  function getCheckpoint(checkpointId) {
    var key = CHECKPOINT_CACHE_KEY_PREFIX + checkpointId;
    var json = CacheService.getScriptCache().get(key);
    if (!json) {
      json = PropertiesService.getScriptProperties().getProperty(key);
    }
    return json ? JSON.parse(json) : null;
  }

  return {
    createCheckpoint: createCheckpoint,
    applySnapshot: applySnapshot,
    getCheckpoint: getCheckpoint
  };

})();
