// ============================================================
// SPREADSTER — Spreadsheet Operations (SpreadsheetOperations.gs)
// All low-level Google Sheets operations
// ============================================================

var SpreadsheetOperations = (function() {

  function ok(message) { return { success: true, message: message || 'OK' }; }
  function err(e, msg) { return { success: false, error: (msg || '') + ': ' + e.toString() }; }

  function getSheet(ss, sheetName) {
    if (!sheetName) return ss.getActiveSheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);
    return sheet;
  }

  // ============================================================
  // SHEET STRUCTURE
  // ============================================================

  function createSheet(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss.getSheetByName(op.sheetName)) {
        return err('already exists', 'Sheet "' + op.sheetName + '"');
      }
      var sheet = ss.insertSheet(op.sheetName);
      if (op.index !== undefined && op.index !== null) {
        ss.setActiveSheet(sheet);
        ss.moveActiveSheet(op.index + 1);
      }
      if (op.tabColor) sheet.setTabColor(op.tabColor);
      return ok('Sheet created: ' + op.sheetName);
    } catch(e) { return err(e, 'createSheet'); }
  }

  function deleteSheet(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = getSheet(ss, op.sheetName);
      ss.deleteSheet(sheet);
      return ok('Sheet deleted: ' + op.sheetName);
    } catch(e) { return err(e, 'deleteSheet'); }
  }

  function renameSheet(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = getSheet(ss, op.sheetName);
      sheet.setName(op.newName);
      return ok('Sheet renamed to: ' + op.newName);
    } catch(e) { return err(e, 'renameSheet'); }
  }

  function duplicateSheet(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = getSheet(ss, op.sheetName);
      var copy = sheet.copyTo(ss);
      copy.setName(op.newName || (op.sheetName + ' (Copy)'));
      return ok('Sheet duplicated');
    } catch(e) { return err(e, 'duplicateSheet'); }
  }

  function hideSheet(op) {
    try {
      getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName).hideSheet();
      return ok('Sheet hidden');
    } catch(e) { return err(e, 'hideSheet'); }
  }

  function showSheet(op) {
    try {
      getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName).showSheet();
      return ok('Sheet shown');
    } catch(e) { return err(e, 'showSheet'); }
  }

  function reorderSheets(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = getSheet(ss, op.sheetName);
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(op.newIndex + 1);
      return ok('Sheet reordered');
    } catch(e) { return err(e, 'reorderSheets'); }
  }

  function setTabColor(op) {
    try {
      getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName).setTabColor(op.color);
      return ok('Tab color set');
    } catch(e) { return err(e, 'setTabColor'); }
  }

  // ============================================================
  // DATA OPERATIONS
  // ============================================================

  function setValue(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = getSheet(ss, op.sheetName);
      var range = sheet.getRange(op.range);
      if (op.value !== undefined) range.setValue(op.value);
      return ok('Value set');
    } catch(e) { return err(e, 'setValue'); }
  }

  function setValues(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = getSheet(ss, op.sheetName);
      var range = sheet.getRange(op.range);
      if (op.values) range.setValues(op.values);
      return ok('Values set (' + (op.values ? op.values.length : 0) + ' rows)');
    } catch(e) { return err(e, 'setValues'); }
  }

  function clearRange(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).clear();
      return ok('Range cleared');
    } catch(e) { return err(e, 'clearRange'); }
  }

  function clearContents(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).clearContent();
      return ok('Contents cleared');
    } catch(e) { return err(e, 'clearContents'); }
  }

  function clearFormats(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).clearFormat();
      return ok('Formats cleared');
    } catch(e) { return err(e, 'clearFormats'); }
  }

  function copyRange(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var srcSheet = getSheet(ss, op.sheetName);
      var destSheet = op.destSheetName ? getSheet(ss, op.destSheetName) : srcSheet;
      var src = srcSheet.getRange(op.range);
      var dest = destSheet.getRange(op.destRange);
      src.copyTo(dest);
      return ok('Range copied');
    } catch(e) { return err(e, 'copyRange'); }
  }

  function moveRange(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var srcSheet = getSheet(ss, op.sheetName);
      var destSheet = op.destSheetName ? getSheet(ss, op.destSheetName) : srcSheet;
      var src = srcSheet.getRange(op.range);
      var dest = destSheet.getRange(op.destRange);
      src.moveTo(dest);
      return ok('Range moved');
    } catch(e) { return err(e, 'moveRange'); }
  }

  function sortRange(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      var col = op.sortColumn || 1;
      var ascending = op.ascending !== false;
      range.sort({ column: col, ascending: ascending });
      return ok('Range sorted');
    } catch(e) { return err(e, 'sortRange'); }
  }

  function filterRange(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      var filter = range.createFilter();
      if (op.filterCriteria && op.filterCriteria.length > 0) {
        for (var i = 0; i < op.filterCriteria.length; i++) {
          var fc = op.filterCriteria[i];
          var criteria = SpreadsheetApp.newFilterCriteria();
          if (fc.hiddenValues) criteria.setHiddenValues(fc.hiddenValues);
          if (fc.visibleValues) criteria.setVisibleValues(fc.visibleValues);
          filter.setColumnFilterCriteria(fc.columnIndex, criteria.build());
        }
      }
      return ok('Filter applied');
    } catch(e) { return err(e, 'filterRange'); }
  }

  function removeFilter(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var filter = sheet.getFilter();
      if (filter) filter.remove();
      return ok('Filter removed');
    } catch(e) { return err(e, 'removeFilter'); }
  }

  // ============================================================
  // ROW / COLUMN STRUCTURE
  // ============================================================

  function insertRow(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var count = op.count || 1;
      if (op.before) {
        sheet.insertRowsBefore(op.rowIndex, count);
      } else {
        sheet.insertRowsAfter(op.rowIndex, count);
      }
      return ok('Row(s) inserted');
    } catch(e) { return err(e, 'insertRow'); }
  }

  function insertColumn(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var count = op.count || 1;
      if (op.before) {
        sheet.insertColumnsBefore(op.columnIndex, count);
      } else {
        sheet.insertColumnsAfter(op.columnIndex, count);
      }
      return ok('Column(s) inserted');
    } catch(e) { return err(e, 'insertColumn'); }
  }

  function deleteRow(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var count = op.count || 1;
      sheet.deleteRows(op.rowIndex, count);
      return ok('Row(s) deleted');
    } catch(e) { return err(e, 'deleteRow'); }
  }

  function deleteColumn(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var count = op.count || 1;
      sheet.deleteColumns(op.columnIndex, count);
      return ok('Column(s) deleted');
    } catch(e) { return err(e, 'deleteColumn'); }
  }

  function hideRow(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.hideRows(op.rowIndex, op.count || 1);
      return ok('Row(s) hidden');
    } catch(e) { return err(e, 'hideRow'); }
  }

  function hideColumn(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.hideColumns(op.columnIndex, op.count || 1);
      return ok('Column(s) hidden');
    } catch(e) { return err(e, 'hideColumn'); }
  }

  function showRow(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.showRows(op.rowIndex, op.count || 1);
      return ok('Row(s) shown');
    } catch(e) { return err(e, 'showRow'); }
  }

  function showColumn(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.showColumns(op.columnIndex, op.count || 1);
      return ok('Column(s) shown');
    } catch(e) { return err(e, 'showColumn'); }
  }

  function resizeColumn(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      if (op.width === 'auto' || op.autoFit) {
        sheet.autoResizeColumn(op.columnIndex);
      } else {
        sheet.setColumnWidth(op.columnIndex, op.width);
      }
      return ok('Column resized');
    } catch(e) { return err(e, 'resizeColumn'); }
  }

  function resizeRow(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.setRowHeight(op.rowIndex, op.height);
      return ok('Row resized');
    } catch(e) { return err(e, 'resizeRow'); }
  }

  // ============================================================
  // FORMATTING
  // ============================================================

  function formatRange(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      var fmt = op.format || op;

      if (fmt.backgroundColor) range.setBackground(fmt.backgroundColor);
      if (fmt.fontColor) range.setFontColor(fmt.fontColor);
      if (fmt.fontSize) range.setFontSize(fmt.fontSize);
      if (fmt.bold !== undefined) range.setFontWeight(fmt.bold ? 'bold' : 'normal');
      if (fmt.italic !== undefined) range.setFontStyle(fmt.italic ? 'italic' : 'normal');
      if (fmt.underline !== undefined) range.setFontLine(fmt.underline ? 'underline' : 'none');
      if (fmt.strikethrough !== undefined) range.setFontLine(fmt.strikethrough ? 'line-through' : 'none');
      if (fmt.fontFamily) range.setFontFamily(fmt.fontFamily);
      if (fmt.numberFormat) range.setNumberFormat(fmt.numberFormat);
      if (fmt.wrapStrategy) range.setWrap(fmt.wrapStrategy === 'WRAP');
      if (fmt.horizontalAlignment) range.setHorizontalAlignment(fmt.horizontalAlignment.toLowerCase());
      if (fmt.verticalAlignment) range.setVerticalAlignment(fmt.verticalAlignment.toLowerCase());

      if (fmt.borders) {
        var b = fmt.borders;
        range.setBorder(
          b.top !== undefined ? b.top : null,
          b.left !== undefined ? b.left : null,
          b.bottom !== undefined ? b.bottom : null,
          b.right !== undefined ? b.right : null,
          b.vertical !== undefined ? b.vertical : null,
          b.horizontal !== undefined ? b.horizontal : null,
          b.color || '#000000',
          SpreadsheetApp.BorderStyle[b.style || 'SOLID']
        );
      }

      return ok('Range formatted');
    } catch(e) { return err(e, 'formatRange'); }
  }

  function setBackground(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).setBackground(op.color);
      return ok('Background set');
    } catch(e) { return err(e, 'setBackground'); }
  }

  function setFont(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      if (op.family) range.setFontFamily(op.family);
      if (op.size) range.setFontSize(op.size);
      if (op.color) range.setFontColor(op.color);
      if (op.bold !== undefined) range.setFontWeight(op.bold ? 'bold' : 'normal');
      if (op.italic !== undefined) range.setFontStyle(op.italic ? 'italic' : 'normal');
      return ok('Font set');
    } catch(e) { return err(e, 'setFont'); }
  }

  function setBorder(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      var style = op.style ? SpreadsheetApp.BorderStyle[op.style] : SpreadsheetApp.BorderStyle.SOLID;
      range.setBorder(
        op.top !== undefined ? op.top : null,
        op.left !== undefined ? op.left : null,
        op.bottom !== undefined ? op.bottom : null,
        op.right !== undefined ? op.right : null,
        op.inner !== undefined ? op.inner : null,
        op.outer !== undefined ? op.outer : null,
        op.color || '#000000',
        style
      );
      return ok('Border set');
    } catch(e) { return err(e, 'setBorder'); }
  }

  function setNumberFormat(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).setNumberFormat(op.pattern);
      return ok('Number format set');
    } catch(e) { return err(e, 'setNumberFormat'); }
  }

  function mergeCells(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      var type = (op.mergeType || 'ALL').toUpperCase();
      if (type === 'HORIZONTAL') {
        range.mergeAcross();
      } else if (type === 'VERTICAL') {
        range.mergeVertically();
      } else {
        range.merge();
      }
      return ok('Cells merged');
    } catch(e) { return err(e, 'mergeCells'); }
  }

  function unmergeCells(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).breakApart();
      return ok('Cells unmerged');
    } catch(e) { return err(e, 'unmergeCells'); }
  }

  function setWrap(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).setWrap(op.wrap !== false);
      return ok('Wrap set');
    } catch(e) { return err(e, 'setWrap'); }
  }

  function setAlignment(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      if (op.horizontal) range.setHorizontalAlignment(op.horizontal.toLowerCase());
      if (op.vertical) range.setVerticalAlignment(op.vertical.toLowerCase());
      return ok('Alignment set');
    } catch(e) { return err(e, 'setAlignment'); }
  }

  function freezeRows(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.setFrozenRows(op.count || 1);
      return ok('Rows frozen: ' + (op.count || 1));
    } catch(e) { return err(e, 'freezeRows'); }
  }

  function freezeColumns(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.setFrozenColumns(op.count || 1);
      return ok('Columns frozen: ' + (op.count || 1));
    } catch(e) { return err(e, 'freezeColumns'); }
  }

  function unfreeze(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.setFrozenRows(0);
      sheet.setFrozenColumns(0);
      return ok('Unfrozen');
    } catch(e) { return err(e, 'unfreeze'); }
  }

  function conditionalFormat(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      var rules = sheet.getConditionalFormatRules();
      var rule;

      var condType = (op.conditionType || '').toUpperCase();
      var builder = SpreadsheetApp.newConditionalFormatRule()
        .setRanges([range])
        .setBackground(op.backgroundColor || '#FFFF00')
        .setBold(op.bold || false);

      if (condType === 'BLANK') {
        rule = builder.whenCellEmpty().build();
      } else if (condType === 'NOT_BLANK') {
        rule = builder.whenCellNotEmpty().build();
      } else if (condType === 'CUSTOM_FORMULA' && op.formula) {
        rule = builder.whenFormulaSatisfied(op.formula).build();
      } else if (condType === 'GREATER_THAN' && op.value !== undefined) {
        rule = builder.whenNumberGreaterThan(op.value).build();
      } else if (condType === 'LESS_THAN' && op.value !== undefined) {
        rule = builder.whenNumberLessThan(op.value).build();
      } else if (condType === 'EQUAL' && op.value !== undefined) {
        rule = builder.whenNumberEqualTo(op.value).build();
      } else if (condType === 'TEXT_CONTAINS' && op.text) {
        rule = builder.whenTextContains(op.text).build();
      } else {
        return { success: false, error: 'Unknown conditional format type: ' + condType };
      }

      rules.push(rule);
      sheet.setConditionalFormatRules(rules);
      return ok('Conditional format applied');
    } catch(e) { return err(e, 'conditionalFormat'); }
  }

  // ============================================================
  // NAMED RANGES
  // ============================================================

  function createNamedRange(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = getSheet(ss, op.sheetName);
      var range = sheet.getRange(op.range);
      ss.setNamedRange(op.name, range);
      return ok('Named range created: ' + op.name);
    } catch(e) { return err(e, 'createNamedRange'); }
  }

  function deleteNamedRange(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      ss.removeNamedRange(op.name);
      return ok('Named range deleted: ' + op.name);
    } catch(e) { return err(e, 'deleteNamedRange'); }
  }

  // ============================================================
  // DATA VALIDATION
  // ============================================================

  function setDataValidation(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var range = sheet.getRange(op.range);
      var builder = SpreadsheetApp.newDataValidation();
      var vType = (op.validationType || '').toUpperCase();

      if (vType === 'LIST' && op.values) {
        builder.requireValueInList(op.values, op.showDropdown !== false);
      } else if (vType === 'NUMBER_RANGE' && op.min !== undefined && op.max !== undefined) {
        builder.requireNumberBetween(op.min, op.max);
      } else if (vType === 'NUMBER_GREATER_THAN' && op.value !== undefined) {
        builder.requireNumberGreaterThan(op.value);
      } else if (vType === 'NUMBER_LESS_THAN' && op.value !== undefined) {
        builder.requireNumberLessThan(op.value);
      } else if (vType === 'DATE_BETWEEN' && op.start && op.end) {
        builder.requireDateBetween(new Date(op.start), new Date(op.end));
      } else if (vType === 'TEXT_CONTAINS' && op.text) {
        builder.requireTextContains(op.text);
      } else if (vType === 'CHECKBOX') {
        builder.requireCheckbox();
      } else if (vType === 'CUSTOM_FORMULA' && op.formula) {
        builder.requireFormulaSatisfied(op.formula);
      } else {
        return { success: false, error: 'Unknown validation type: ' + vType };
      }

      if (op.helpText) builder.setHelpText(op.helpText);
      builder.setAllowInvalid(op.allowInvalid !== false);
      range.setDataValidation(builder.build());
      return ok('Data validation set');
    } catch(e) { return err(e, 'setDataValidation'); }
  }

  function removeDataValidation(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).clearDataValidations();
      return ok('Data validation removed');
    } catch(e) { return err(e, 'removeDataValidation'); }
  }

  // ============================================================
  // PROTECTION
  // ============================================================

  function protectRange(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var protection = sheet.getRange(op.range).protect();
      if (op.description) protection.setDescription(op.description);
      if (op.unprotectedRanges) {
        var unprotected = op.unprotectedRanges.map(function(r) {
          return sheet.getRange(r);
        });
        protection.setUnprotectedRanges(unprotected);
      }
      if (op.warningOnly) protection.setWarningOnly(true);
      return ok('Range protected');
    } catch(e) { return err(e, 'protectRange'); }
  }

  function protectSheet(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var protection = sheet.protect();
      if (op.description) protection.setDescription(op.description);
      if (op.warningOnly) protection.setWarningOnly(true);
      return ok('Sheet protected');
    } catch(e) { return err(e, 'protectSheet'); }
  }

  function unprotectRange(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
      for (var i = 0; i < protections.length; i++) {
        if (protections[i].getRange().getA1Notation() === op.range) {
          protections[i].remove();
          break;
        }
      }
      return ok('Range unprotected');
    } catch(e) { return err(e, 'unprotectRange'); }
  }

  // ============================================================
  // PIVOT TABLE (simplified)
  // ============================================================

  function createPivotTable(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var srcSheet = getSheet(ss, op.sourceSheetName);
      var destSheet = getSheet(ss, op.destinationSheetName || op.sourceSheetName);
      var srcRange = srcSheet.getRange(op.sourceRange);
      var destRange = destSheet.getRange(op.destinationCell || 'A1');
      var pivot = destRange.createPivotTable(srcRange);

      if (op.rows) {
        op.rows.forEach(function(row) {
          pivot.addRowGroup(row.columnIndex);
        });
      }
      if (op.columns) {
        op.columns.forEach(function(col) {
          pivot.addColumnGroup(col.columnIndex);
        });
      }
      if (op.values) {
        op.values.forEach(function(val) {
          pivot.addPivotValue(
            val.columnIndex,
            SpreadsheetApp.PivotTableSummarizeFunction[val.summarizeFunction || 'SUM']
          );
        });
      }

      return ok('Pivot table created');
    } catch(e) { return err(e, 'createPivotTable'); }
  }

  // ============================================================
  // COMMENTS
  // ============================================================

  function addComment(op) {
    try {
      var sheet = getSheet(SpreadsheetApp.getActiveSpreadsheet(), op.sheetName);
      sheet.getRange(op.range).setNote(op.comment);
      return ok('Comment added');
    } catch(e) { return err(e, 'addComment'); }
  }

  return {
    createSheet: createSheet,
    deleteSheet: deleteSheet,
    renameSheet: renameSheet,
    duplicateSheet: duplicateSheet,
    hideSheet: hideSheet,
    showSheet: showSheet,
    reorderSheets: reorderSheets,
    setTabColor: setTabColor,
    setValue: setValue,
    setValues: setValues,
    clearRange: clearRange,
    clearContents: clearContents,
    clearFormats: clearFormats,
    copyRange: copyRange,
    moveRange: moveRange,
    sortRange: sortRange,
    filterRange: filterRange,
    removeFilter: removeFilter,
    insertRow: insertRow,
    insertColumn: insertColumn,
    deleteRow: deleteRow,
    deleteColumn: deleteColumn,
    hideRow: hideRow,
    hideColumn: hideColumn,
    showRow: showRow,
    showColumn: showColumn,
    resizeColumn: resizeColumn,
    resizeRow: resizeRow,
    formatRange: formatRange,
    setBackground: setBackground,
    setFont: setFont,
    setBorder: setBorder,
    setNumberFormat: setNumberFormat,
    mergeCells: mergeCells,
    unmergeCells: unmergeCells,
    setWrap: setWrap,
    setAlignment: setAlignment,
    freezeRows: freezeRows,
    freezeColumns: freezeColumns,
    unfreeze: unfreeze,
    conditionalFormat: conditionalFormat,
    createNamedRange: createNamedRange,
    deleteNamedRange: deleteNamedRange,
    setDataValidation: setDataValidation,
    removeDataValidation: removeDataValidation,
    protectRange: protectRange,
    protectSheet: protectSheet,
    unprotectRange: unprotectRange,
    createPivotTable: createPivotTable,
    addComment: addComment
  };

})();
