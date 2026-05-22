// ============================================================
// SPREADSTER — GAS Execution Engine (ExecutionEngine.gs)
// Dispatches InstructionSet operations to the correct handler
// ============================================================

var ExecutionEngine = (function() {

  /**
   * Execute a complete instruction set
   * Creates a rollback checkpoint first, then executes operation by operation
   */
  function execute(instructionSet) {
    var log = [];
    var operationsExecuted = 0;
    var operationsFailed = 0;
    var checkpoint = null;

    try {
      // Pre-execution checkpoint
      checkpoint = RollbackEngine.createCheckpoint(
        instructionSet.id || 'batch-' + Date.now(),
        instructionSet.summary || 'Operation batch'
      );

      // Execute each operation
      var operations = instructionSet.operations || [];
      for (var i = 0; i < operations.length; i++) {
        var op = operations[i];
        var opResult = executeOperation(op);

        log.push({
          operationType: op.type,
          success: opResult.success,
          message: opResult.message,
          error: opResult.error,
          index: i
        });

        if (opResult.success) {
          operationsExecuted++;
          AuditLogger.log(op.type, 'SUCCESS', op, instructionSet.id);
        } else {
          operationsFailed++;
          AuditLogger.log(op.type, 'FAILED', op, instructionSet.id, opResult.error);

          // Abort on failure if the op was critical
          if (op.abortOnFailure === true) {
            break;
          }
        }
      }

      // Apply post-execution formulas if provided
      if (instructionSet.formulas && instructionSet.formulas.length > 0) {
        for (var fi = 0; fi < instructionSet.formulas.length; fi++) {
          try {
            FormulasEngine.applyFormula(instructionSet.formulas[fi]);
            operationsExecuted++;
            log.push({ operationType: 'FORMULA', success: true, message: 'Formula applied', index: -1 });
          } catch(fe) {
            operationsFailed++;
            log.push({ operationType: 'FORMULA', success: false, error: fe.toString(), index: -1 });
          }
        }
      }

      // Apply charts if provided
      if (instructionSet.charts && instructionSet.charts.length > 0) {
        for (var ci = 0; ci < instructionSet.charts.length; ci++) {
          try {
            ChartsEngine.createChart(instructionSet.charts[ci]);
            operationsExecuted++;
            log.push({ operationType: 'CHART', success: true, message: 'Chart created', index: -1 });
          } catch(ce) {
            operationsFailed++;
            log.push({ operationType: 'CHART', success: false, error: ce.toString(), index: -1 });
          }
        }
      }

      // Flush to ensure all changes are committed
      SpreadsheetApp.flush();

      return {
        success: operationsFailed === 0,
        operationsExecuted: operationsExecuted,
        operationsFailed: operationsFailed,
        checkpointId: checkpoint ? checkpoint.id : null,
        log: log
      };
    } catch(e) {
      // Global failure — attempt rollback
      if (checkpoint) {
        try {
          RollbackEngine.applySnapshot(checkpoint.snapshot);
          SpreadsheetApp.getActiveSpreadsheet().toast(
            '⚠️ Execution failed. Changes rolled back.',
            'SPREADSTER',
            8
          );
        } catch(re) {
          // Rollback also failed — log it
          AuditLogger.log('ROLLBACK', 'FAILED', {}, null, re.toString());
        }
      }

      return {
        success: false,
        operationsExecuted: operationsExecuted,
        operationsFailed: operationsFailed,
        error: e.toString(),
        log: log
      };
    }
  }

  /**
   * Route a single operation to the correct handler
   */
  function executeOperation(op) {
    if (!op || !op.type) {
      return { success: false, error: 'Invalid operation: missing type' };
    }

    try {
      var type = op.type;

      // ---- Sheet structure ops ----
      if (type === 'CREATE_SHEET')         return SpreadsheetOperations.createSheet(op);
      if (type === 'DELETE_SHEET')         return SpreadsheetOperations.deleteSheet(op);
      if (type === 'RENAME_SHEET')         return SpreadsheetOperations.renameSheet(op);
      if (type === 'DUPLICATE_SHEET')      return SpreadsheetOperations.duplicateSheet(op);
      if (type === 'HIDE_SHEET')           return SpreadsheetOperations.hideSheet(op);
      if (type === 'SHOW_SHEET')           return SpreadsheetOperations.showSheet(op);
      if (type === 'REORDER_SHEETS')       return SpreadsheetOperations.reorderSheets(op);
      if (type === 'SET_TAB_COLOR')        return SpreadsheetOperations.setTabColor(op);

      // ---- Cell / range data ops ----
      if (type === 'SET_VALUE')            return SpreadsheetOperations.setValue(op);
      if (type === 'SET_VALUES')           return SpreadsheetOperations.setValues(op);
      if (type === 'CLEAR_RANGE')          return SpreadsheetOperations.clearRange(op);
      if (type === 'CLEAR_CONTENTS')       return SpreadsheetOperations.clearContents(op);
      if (type === 'CLEAR_FORMATS')        return SpreadsheetOperations.clearFormats(op);
      if (type === 'COPY_RANGE')           return SpreadsheetOperations.copyRange(op);
      if (type === 'MOVE_RANGE')           return SpreadsheetOperations.moveRange(op);
      if (type === 'SORT_RANGE')           return SpreadsheetOperations.sortRange(op);
      if (type === 'FILTER_RANGE')         return SpreadsheetOperations.filterRange(op);
      if (type === 'REMOVE_FILTER')        return SpreadsheetOperations.removeFilter(op);

      // ---- Row / column structure ----
      if (type === 'INSERT_ROW')           return SpreadsheetOperations.insertRow(op);
      if (type === 'INSERT_COLUMN')        return SpreadsheetOperations.insertColumn(op);
      if (type === 'DELETE_ROW')           return SpreadsheetOperations.deleteRow(op);
      if (type === 'DELETE_COLUMN')        return SpreadsheetOperations.deleteColumn(op);
      if (type === 'HIDE_ROW')             return SpreadsheetOperations.hideRow(op);
      if (type === 'HIDE_COLUMN')          return SpreadsheetOperations.hideColumn(op);
      if (type === 'SHOW_ROW')             return SpreadsheetOperations.showRow(op);
      if (type === 'SHOW_COLUMN')          return SpreadsheetOperations.showColumn(op);
      if (type === 'RESIZE_COLUMN')        return SpreadsheetOperations.resizeColumn(op);
      if (type === 'RESIZE_ROW')           return SpreadsheetOperations.resizeRow(op);

      // ---- Formatting ----
      if (type === 'FORMAT_RANGE')         return SpreadsheetOperations.formatRange(op);
      if (type === 'SET_BACKGROUND')       return SpreadsheetOperations.setBackground(op);
      if (type === 'SET_FONT')             return SpreadsheetOperations.setFont(op);
      if (type === 'SET_BORDER')           return SpreadsheetOperations.setBorder(op);
      if (type === 'SET_NUMBER_FORMAT')    return SpreadsheetOperations.setNumberFormat(op);
      if (type === 'MERGE_CELLS')          return SpreadsheetOperations.mergeCells(op);
      if (type === 'UNMERGE_CELLS')        return SpreadsheetOperations.unmergeCells(op);
      if (type === 'SET_WRAP')             return SpreadsheetOperations.setWrap(op);
      if (type === 'SET_ALIGNMENT')        return SpreadsheetOperations.setAlignment(op);
      if (type === 'FREEZE_ROWS')          return SpreadsheetOperations.freezeRows(op);
      if (type === 'FREEZE_COLUMNS')       return SpreadsheetOperations.freezeColumns(op);
      if (type === 'UNFREEZE')             return SpreadsheetOperations.unfreeze(op);
      if (type === 'CONDITIONAL_FORMAT')   return SpreadsheetOperations.conditionalFormat(op);

      // ---- Named ranges ----
      if (type === 'NAMED_RANGE_CREATE')   return SpreadsheetOperations.createNamedRange(op);
      if (type === 'NAMED_RANGE_DELETE')   return SpreadsheetOperations.deleteNamedRange(op);

      // ---- Formulas (inline ops) ----
      if (type === 'SET_FORMULA')          return FormulasEngine.setFormula(op);
      if (type === 'APPLY_ARRAY_FORMULA')  return FormulasEngine.applyArrayFormula(op);

      // ---- Charts ----
      if (type === 'CREATE_CHART')         return ChartsEngine.createChart(op.params || op);
      if (type === 'DELETE_CHART')         return ChartsEngine.deleteChart(op);
      if (type === 'UPDATE_CHART')         return ChartsEngine.updateChart(op);

      // ---- Data validation ----
      if (type === 'DATA_VALIDATION')      return SpreadsheetOperations.setDataValidation(op);
      if (type === 'REMOVE_VALIDATION')    return SpreadsheetOperations.removeDataValidation(op);

      // ---- Protection ----
      if (type === 'PROTECT_RANGE')        return SpreadsheetOperations.protectRange(op);
      if (type === 'PROTECT_SHEET')        return SpreadsheetOperations.protectSheet(op);
      if (type === 'UNPROTECT_RANGE')      return SpreadsheetOperations.unprotectRange(op);

      // ---- Pivot tables ----
      if (type === 'PIVOT_TABLE')          return SpreadsheetOperations.createPivotTable(op);

      // ---- Automation / notifications ----
      if (type === 'SEND_EMAIL')           return AutomationEngine.sendEmail(op);
      if (type === 'CREATE_TRIGGER')       return AutomationEngine.createTrigger(op);
      if (type === 'DELETE_TRIGGER')       return AutomationEngine.deleteTrigger(op);
      if (type === 'SHOW_DIALOG')          return AutomationEngine.showDialog(op);
      if (type === 'SHOW_TOAST')           return AutomationEngine.showToast(op);
      if (type === 'ADD_COMMENT')          return SpreadsheetOperations.addComment(op);

      return { success: false, error: 'Unknown operation type: ' + type };
    } catch(e) {
      return { success: false, error: e.toString() };
    }
  }

  return { execute: execute, executeOperation: executeOperation };

})();
