// ============================================================
// SPREADSTER — Formulas Engine (FormulasEngine.gs)
// ============================================================

var FormulasEngine = (function() {

  function ok(msg) { return { success: true, message: msg || 'OK' }; }
  function err(e, ctx) { return { success: false, error: (ctx || '') + ': ' + e.toString() }; }

  var BLOCKED_FUNCTIONS = [
    'IMPORTDATA', 'IMPORTHTML', 'IMPORTXML', 'IMPORTFEED', 'IMPORTRANGE'
  ];

  function isSafe(formula) {
    var upper = formula.toUpperCase();
    for (var i = 0; i < BLOCKED_FUNCTIONS.length; i++) {
      if (upper.indexOf(BLOCKED_FUNCTIONS[i]) !== -1) return false;
    }
    return true;
  }

  function setFormula(op) {
    try {
      if (!isSafe(op.formula)) {
        return { success: false, error: 'Blocked formula function detected: ' + op.formula };
      }
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(op.sheetName);
      if (!sheet) return { success: false, error: 'Sheet not found: ' + op.sheetName };
      var formula = op.formula.startsWith('=') ? op.formula : '=' + op.formula;
      sheet.getRange(op.range).setFormula(formula);
      return ok('Formula set: ' + op.range);
    } catch(e) { return err(e, 'setFormula'); }
  }

  function applyArrayFormula(op) {
    try {
      if (!isSafe(op.formula)) {
        return { success: false, error: 'Blocked formula function: ' + op.formula };
      }
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(op.sheetName);
      if (!sheet) return { success: false, error: 'Sheet not found: ' + op.sheetName };
      var formula = op.formula.startsWith('=') ? op.formula : '=' + op.formula;
      var arrayFormula = '=ARRAYFORMULA(' + formula.slice(1) + ')';
      sheet.getRange(op.range).setFormula(arrayFormula);
      return ok('Array formula set');
    } catch(e) { return err(e, 'applyArrayFormula'); }
  }

  function applyFormula(formulaDef) {
    return setFormula(formulaDef);
  }

  return {
    setFormula: setFormula,
    applyArrayFormula: applyArrayFormula,
    applyFormula: applyFormula
  };

})();
