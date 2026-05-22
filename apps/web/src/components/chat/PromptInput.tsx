import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptInputProps {
  onSend: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_CHARS = 2000;

export function PromptInput({ onSend, disabled, placeholder }: PromptInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setValue(e.target.value);
      adjustHeight();
    }
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = value.length;
  const isNearLimit = charCount > MAX_CHARS * 0.85;

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border bg-card transition-all',
          'focus-within:ring-2 focus-within:ring-ring focus-within:border-primary',
          disabled && 'opacity-60',
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? 'Ask me to build, format, analyze, or automate anything…'}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent px-3.5 py-3 text-sm outline-none',
            'placeholder:text-muted-foreground/60 min-h-[44px]',
            'scrollbar-thin',
          )}
          style={{ height: 'auto' }}
        />

        {/* Send button */}
        <div className="flex items-center gap-1 pr-2 pb-2">
          <AnimatePresence mode="wait">
            {disabled ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={18} className="text-primary animate-spin" />
              </motion.div>
            ) : (
              <motion.button
                key="send"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSubmit}
                disabled={!value.trim() || disabled}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  value.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                <Send size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Character count */}
      <AnimatePresence>
        {isNearLimit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute bottom-[-18px] right-1 text-[10px]',
              charCount >= MAX_CHARS ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {charCount}/{MAX_CHARS}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard hint */}
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/50 pl-1">
        <Sparkles size={9} />
        <span>Enter to send · Shift+Enter for new line</span>
      </div>
    </div>
  );
}
