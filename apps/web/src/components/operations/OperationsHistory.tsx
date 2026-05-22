import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useOperationStore } from '@/stores/operationStore';
import { cn, formatRelativeTime } from '@/lib/utils';

export function OperationsHistory() {
  const { batches, loadBatches } = useOperationStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusIcon = (status: string) => {
    if (status === 'SUCCESS') return <CheckCircle2 size={12} className="text-green-500" />;
    if (status === 'FAILED') return <XCircle size={12} className="text-destructive" />;
    if (status === 'EXECUTING') return <Clock size={12} className="text-primary animate-pulse" />;
    if (status === 'ROLLED_BACK') return <RotateCcw size={12} className="text-amber-500" />;
    return <Clock size={12} className="text-muted-foreground" />;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      SUCCESS: 'Success',
      FAILED: 'Failed',
      PARTIAL_SUCCESS: 'Partial',
      EXECUTING: 'Running',
      ROLLED_BACK: 'Rolled Back',
      PENDING: 'Pending',
    };
    return map[status] ?? status;
  };

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-4">
        <Clock size={24} className="text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No operations yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Executed operations will appear here</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 space-y-1.5">
      {batches.map((batch, i) => (
        <motion.div
          key={batch.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setExpandedId(expandedId === batch.id ? null : batch.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/30 transition-colors text-left"
          >
            {statusIcon(batch.status)}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">{batch.promptRaw}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span>{statusLabel(batch.status)}</span>
                <span>·</span>
                <span>{batch.operationsOk}/{batch.operationsTotal} ops</span>
                <span>·</span>
                <span>{formatRelativeTime(batch.createdAt)}</span>
              </div>
            </div>
            <ChevronRight
              size={12}
              className={cn(
                'text-muted-foreground transition-transform flex-shrink-0',
                expandedId === batch.id && 'rotate-90',
              )}
            />
          </button>

          {expandedId === batch.id && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="border-t border-border px-3 py-2"
            >
              <div className="text-[10px] space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Model</span>
                  <span className="font-mono">{batch.aiModel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spreadsheet</span>
                  <span className="truncate max-w-[120px]">{batch.spreadsheetName}</span>
                </div>
                {batch.durationMs && (
                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span>{(batch.durationMs / 1000).toFixed(2)}s</span>
                  </div>
                )}
                {batch.errorMessage && (
                  <div className="mt-1 p-2 bg-destructive/10 rounded text-destructive text-[10px]">
                    {batch.errorMessage}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
