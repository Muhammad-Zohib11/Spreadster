// ============================================================
// SPREADSTER — Charts Engine (ChartsEngine.gs)
// ============================================================

var ChartsEngine = (function() {

  function ok(msg) { return { success: true, message: msg || 'OK' }; }
  function err(e, ctx) { return { success: false, error: (ctx || '') + ': ' + e.toString() }; }

  var CHART_TYPE_MAP = {
    'BAR': Charts.ChartType.BAR,
    'COLUMN': Charts.ChartType.COLUMN,
    'LINE': Charts.ChartType.LINE,
    'AREA': Charts.ChartType.AREA,
    'PIE': Charts.ChartType.PIE,
    'DONUT': Charts.ChartType.PIE,
    'SCATTER': Charts.ChartType.SCATTER,
    'COMBO': Charts.ChartType.COMBO,
    'HISTOGRAM': Charts.ChartType.HISTOGRAM,
    'TREEMAP': Charts.ChartType.TREEMAP,
    'WATERFALL': Charts.ChartType.WATERFALL,
    'GAUGE': Charts.ChartType.GAUGE,
    'CANDLESTICK': Charts.ChartType.CANDLESTICK,
    'ORG': Charts.ChartType.ORG,
    'TABLE': Charts.ChartType.TABLE,
  };

  function createChart(params) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(params.sourceSheetName);
      if (!sheet) return { success: false, error: 'Sheet not found: ' + params.sourceSheetName };

      var chartType = CHART_TYPE_MAP[(params.chartType || 'COLUMN').toUpperCase()];
      if (!chartType) chartType = Charts.ChartType.COLUMN;

      var builder = sheet.newChart()
        .setChartType(chartType)
        .setPosition(params.anchorRowOffset || 5, params.anchorColumnOffset || 5, 0, 0);

      // Add data ranges
      if (params.dataRanges && params.dataRanges.length > 0) {
        params.dataRanges.forEach(function(rangeStr) {
          builder.addRange(sheet.getRange(rangeStr));
        });
      }

      // Title and labels
      if (params.title) {
        builder.setOption('title', params.title);
      }
      if (params.xAxisTitle) {
        builder.setOption('hAxis.title', params.xAxisTitle);
      }
      if (params.yAxisTitle) {
        builder.setOption('vAxis.title', params.yAxisTitle);
      }
      if (params.legendPosition) {
        builder.setOption('legend.position', params.legendPosition.toLowerCase());
      }

      // 3D option
      if (params.is3D) {
        builder.setOption('is3D', true);
      }

      // Stack for bar/column
      if (params.isStacked) {
        builder.setOption('isStacked', true);
      }

      // Size
      if (params.width) builder.setOption('width', params.width);
      if (params.height) builder.setOption('height', params.height);

      sheet.insertChart(builder.build());
      return ok('Chart created: ' + (params.chartType || 'COLUMN'));
    } catch(e) { return err(e, 'createChart'); }
  }

  function deleteChart(op) {
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(op.sheetName);
      if (!sheet) return { success: false, error: 'Sheet not found: ' + op.sheetName };
      var charts = sheet.getCharts();
      if (op.chartIndex !== undefined && charts[op.chartIndex]) {
        sheet.removeChart(charts[op.chartIndex]);
        return ok('Chart deleted');
      }
      // Delete by title if index not given
      if (op.chartTitle) {
        for (var i = 0; i < charts.length; i++) {
          if (charts[i].getOptions().get('title') === op.chartTitle) {
            sheet.removeChart(charts[i]);
            return ok('Chart deleted by title');
          }
        }
      }
      return { success: false, error: 'Chart not found' };
    } catch(e) { return err(e, 'deleteChart'); }
  }

  function updateChart(op) {
    try {
      // For simplicity, delete and re-create with new params
      deleteChart(op);
      return createChart(op.params || op);
    } catch(e) { return err(e, 'updateChart'); }
  }

  return {
    createChart: createChart,
    deleteChart: deleteChart,
    updateChart: updateChart
  };

})();
