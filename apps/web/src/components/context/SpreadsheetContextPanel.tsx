import { motion } from 'framer-motion';
import { Database, Layers, Hash, Eye } from 'lucide-react';
import { useSpreadsheetStore } from '@/stores/spreadsheetStore';

export function SpreadsheetContextPanel() {
  const { spreadsheetContext } = useSpreadsheetStore();

  if (!spreadsheetContext) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-4">
        <Database size={24} className="text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No spreadsheet loaded</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Open a Google Sheet to see context</p>
      </div>
    );
  }

  const ctx = spreadsheetContext;

  return (
    <div className="px-3 py-3 space-y-3">
      {/* Spreadsheet Info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-3">
        <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Database size={11} />
          Spreadsheet
        </h3>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium truncate max-w-[140px]">{ctx.spreadsheetName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active Sheet</span>
            <span className="font-medium">{ctx.activeSheetName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Sheets</span>
            <span className="font-medium">{ctx.totalSheets}</span>
          </div>
        </div>
      </motion.div>

      {/* Sheets List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl p-3"
      >
        <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Layers size={11} />
          Sheets ({ctx.sheets.length})
        </h3>
        <div className="space-y-1">
          {ctx.sheets.map((sheet) => (
            <div
              key={sheet.name}
              className={`flex items-center justify-between py-1 px-2 rounded text-[11px] ${
                sheet.name === ctx.activeSheetName
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {sheet.tabColor && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sheet.tabColor }}
                  />
                )}
                <span className="truncate max-w-[100px]">{sheet.name}</span>
                {sheet.isHidden && <Eye size={9} className="opacity-40" />}
              </div>
              <span className="opacity-60">
                {sheet.lastRow}r × {sheet.lastColumn}c
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Named Ranges */}
      {ctx.namedRanges.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-3"
        >
          <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Hash size={11} />
            Named Ranges ({ctx.namedRanges.length})
          </h3>
          <div className="space-y-1">
            {ctx.namedRanges.slice(0, 8).map((nr) => (
              <div key={nr.name} className="flex justify-between text-[11px]">
                <span className="text-foreground font-medium">{nr.name}</span>
                <span className="text-muted-foreground font-mono">{nr.rangeNotation}</span>
              </div>
            ))}
            {ctx.namedRanges.length > 8 && (
              <p className="text-[10px] text-muted-foreground">+{ctx.namedRanges.length - 8} more</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
