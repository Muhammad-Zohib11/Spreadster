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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex gap-2.5 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
        )}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[85%] flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-card border border-border rounded-tl-sm',
          )}
        >
          {message.content}
        </div>

        {/* Warnings */}
        {message.warnings && message.warnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            ⚠️ {message.warnings.join(' · ')}
          </div>
        )}

        {/* Instruction Set Preview */}
        {message.instructionSet && !message.executionResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="w-full bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-accent/50 border-b border-border">
              <div className="flex items-center gap-1.5 text-xs font-medium text-accent-foreground">
                <Zap size={11} />
                <span>{message.instructionSet.operations.length} operations ready</span>
              </div>
              <button
                onClick={() => setShowOps((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {showOps ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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
                  <div className="px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
                    {message.instructionSet.operations.map((op, i) => (
                      <div key={op.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-primary font-mono">{i + 1}.</span>
                        <span className="bg-secondary px-1.5 py-0.5 rounded font-mono text-[10px]">{op.type}</span>
                        {op.sheetName && (
                          <span className="text-[10px] opacity-70">{op.sheetName}</span>
                        )}
                        {op.description && (
                          <span className="flex-1 truncate opacity-60">{op.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-3 py-2 border-t border-border">
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={cn(
                  'w-full py-1.5 rounded-lg text-xs font-semibold transition-all',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isExecuting && 'animate-pulse',
                )}
              >
                {isExecuting ? 'Executing…' : '▶ Execute in Spreadsheet'}
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
              'w-full px-3 py-2 rounded-xl border text-xs',
              message.executionResult.success
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
            )}
          >
            <div className="flex items-center gap-1.5 font-medium mb-1">
              {message.executionResult.success ? (
                <CheckCircle2 size={12} className="text-green-600 dark:text-green-400" />
              ) : (
                <XCircle size={12} className="text-red-600 dark:text-red-400" />
              )}
              <span className={message.executionResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}>
                {message.executionResult.success ? 'Executed successfully' : 'Execution failed'}
              </span>
            </div>
            <div className="text-muted-foreground space-y-0.5">
              <div>{message.executionResult.operationsExecuted} ops completed · {message.executionResult.operationsFailed} failed</div>
              {message.executionResult.summary && <div className="opacity-80">{message.executionResult.summary}</div>}
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
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <span>{formatRelativeTime(message.timestamp)}</span>
          {message.latencyMs && <span>AI: {formatMs(message.latencyMs)}</span>}
        </div>
      </div>
    </motion.div>
  );
}
