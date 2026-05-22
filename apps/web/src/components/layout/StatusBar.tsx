import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Zap, Loader2 } from 'lucide-react';
import { useSpreadsheetStore } from '@/stores/spreadsheetStore';
import { useOperationStore } from '@/stores/operationStore';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { ollamaOnline, selectedModel } = useSpreadsheetStore();
  const { isExecuting } = useOperationStore();

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-card/50 border-t border-border text-[10px] text-muted-foreground flex-shrink-0">
      {/* Ollama status */}
      <div className="flex items-center gap-1">
        {ollamaOnline ? (
          <>
            <Wifi size={9} className="text-green-500" />
            <span className="text-green-600 dark:text-green-400">AI Online</span>
            {selectedModel && (
              <span className="opacity-60 font-mono truncate max-w-[100px]">{selectedModel}</span>
            )}
          </>
        ) : (
          <>
            <WifiOff size={9} className="text-destructive" />
            <span className="text-destructive">Ollama Offline</span>
          </>
        )}
      </div>

      {/* Execution status */}
      <AnimatePresence>
        {isExecuting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-primary"
          >
            <Loader2 size={9} className="animate-spin" />
            <span>Executing…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version */}
      <span className="opacity-40">v1.0</span>
    </div>
  );
}
