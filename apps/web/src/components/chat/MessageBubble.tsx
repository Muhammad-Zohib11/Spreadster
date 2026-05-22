import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, ChevronDown, ChevronUp, CheckCircle2, XCircle, Zap, RotateCcw } from 'lucide-react';
import { cn, formatMs, formatRelativeTime } from '@/lib/utils';
import type { InstructionSet } from '@spreadster/shared';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  instructionSet?: InstructionSet;
  executionResult?: {
    success: boolean;
    operationsExecuted: number;
    operationsFailed: number;
    summary?: string;
    rollbackId?: string;
  };
  warnings?: string[];
  latencyMs?: number;
}

interface MessageBubbleProps {
  message: Message;
  onExecute?: (instructionSet: InstructionSet) => void;
  onRollback?: (rollbackId: string) => void;
  isExecuting?: boolean;
}

export function MessageBubble({ message, onExecute, onRollback, isExecuting }: MessageBubbleProps) {
  const [showOps, setShowOps] = useState(false);
  const isUser = message.role === 'user';

  const handleExecute = useCallback(() => {
    if (message.instructionSet) onExecute?.(message.instructionSet);
  }, [message.instructionSet, onExecute]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn('flex gap-2.5 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-xs',
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25'
            : 'bg-secondary border border-border/60 text-muted-foreground',
        )}
      >
        {isUser ? <User size={12} /> : <Bot size={12} />}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[85%] flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-md shadow-lg shadow-indigo-500/20'
              : 'bg-secondary border border-border/60 text-foreground rounded-tl-md',
          )}
        >
          {message.content}
        </div>

        {/* Warnings */}
        {message.warnings && message.warnings.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-700/40 rounded-xl px-3 py-2 text-xs text-amber-300">
            ⚠️ {message.warnings.join(' · ')}
          </div>
        )}

        {/* Instruction Set Preview */}
        {message.instructionSet && !message.executionResult && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-secondary border border-border/60 rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap size={10} className="text-primary" />
                </div>
                {message.instructionSet.operations.length} operations ready
              </div>
              <button
                onClick={() => setShowOps((v) => !v)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-all"
              >
                {showOps ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            <AnimatePresence>
              {showOps && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 py-2 space-y-1.5 max-h-40 overflow-y-auto">
                    {message.instructionSet.operations.map((op, i) => (
                      <div key={op.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-primary/60 font-mono w-4 text-right flex-shrink-0">{i + 1}.</span>
                        <span className="bg-card/80 px-1.5 py-0.5 rounded-md font-mono text-[10px] border border-border/40">{op.type}</span>
                        {op.sheetName && <span className="text-[10px] opacity-60">{op.sheetName}</span>}
                        {op.description && <span className="flex-1 truncate opacity-50 text-[11px]">{op.description}</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-3 py-2.5 border-t border-border/60">
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={cn(
                  'w-full py-2 rounded-xl text-xs font-semibold transition-all',
                  'bg-gradient-to-r from-indigo-500 to-violet-600 text-white',
                  'hover:shadow-lg hover:shadow-indigo-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isExecuting && 'animate-pulse',
                )}
              >
                {isExecuting ? 'Executing…' : '▶  Apply to Spreadsheet'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Execution Result */}
        {message.executionResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'w-full px-3 py-2.5 rounded-xl border text-xs',
              message.executionResult.success
                ? 'bg-emerald-950/30 border-emerald-700/40'
                : 'bg-red-950/30 border-red-700/40',
            )}
          >
            <div className="flex items-center gap-1.5 font-medium mb-1">
              {message.executionResult.success ? (
                <CheckCircle2 size={12} className="text-emerald-400" />
              ) : (
                <XCircle size={12} className="text-red-400" />
              )}
              <span className={message.executionResult.success ? 'text-emerald-300' : 'text-red-300'}>
                {message.executionResult.success ? 'Applied successfully' : 'Execution failed'}
              </span>
            </div>
            <div className="text-muted-foreground text-[11px]">
              {message.executionResult.operationsExecuted} ops completed · {message.executionResult.operationsFailed} failed
            </div>
            {message.executionResult.rollbackId && (
              <button
                onClick={() => onRollback?.(message.executionResult!.rollbackId!)}
                className="mt-2 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw size={10} />
                <span>Undo changes</span>
              </button>
            )}
          </motion.div>
        )}

        {/* Timestamp + latency */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40">
          <span>{formatRelativeTime(message.timestamp)}</span>
          {message.latencyMs && <span>· {formatMs(message.latencyMs)}</span>}
        </div>
      </div>
    </motion.div>
  );
}
