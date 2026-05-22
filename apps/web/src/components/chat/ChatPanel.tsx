import { useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { PromptInput } from './PromptInput';
import { SuggestedPrompts } from './SuggestedPrompts';
import { TypingIndicator } from './TypingIndicator';
import { useChatStore } from '@/stores/chatStore';
import { useGASBridge } from '@/hooks/useGASBridge';
import { useOperationStore } from '@/stores/operationStore';
import type { InstructionSet } from '@spreadster/shared';

export function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, addUserMessage, addAssistantMessage, updateLastMessage } = useChatStore();
  const { executeInstructionSet, rollback } = useGASBridge();
  const { setExecuting, isExecuting } = useOperationStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleExecute = async (instructionSet: InstructionSet) => {
    setExecuting(true);
    try {
      const result = await executeInstructionSet(instructionSet);
      updateLastMessage(instructionSet.id, {
        executionResult: {
          success: result.success,
          operationsExecuted: result.operationsExecuted,
          operationsFailed: result.operationsFailed,
          rollbackId: result.rollbackId,
          error: result.success ? undefined : result.error,
        },
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleRollback = async (rollbackId: string) => {
    await rollback(rollbackId);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isEmpty ? (
          <SuggestedPrompts />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onExecute={handleExecute}
                onRollback={handleRollback}
                isExecuting={isExecuting}
              />
            ))}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border/40 bg-background px-3 py-3">
        <PromptInput
          onSend={addUserMessage}
          disabled={isLoading || isExecuting}
        />
        <p className="text-center text-[10px] text-muted-foreground/30 mt-2">
          ↵ Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
