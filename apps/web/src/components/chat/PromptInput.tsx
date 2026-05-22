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
      {/* Glow layer */}
      <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-xl pointer-events-none opacity-0 focus-within:opacity-100 transition-opacity duration-500" />

      <div
        className={cn(
          'relative flex items-end gap-2 rounded-2xl border bg-secondary/60 backdrop-blur-sm transition-all duration-200',
          'border-border/60 hover:border-border',
          'focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10',
          disabled && 'opacity-50 pointer-events-none',
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? 'Ask me to build, format, analyze…'}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent px-4 py-3.5 text-sm outline-none',
            'placeholder:text-muted-foreground/40 min-h-[48px] leading-relaxed',
          )}
          style={{ height: 'auto' }}
        />

        {/* Send button */}
        <div className="flex items-center pr-3 pb-3">
          <AnimatePresence mode="wait">
            {disabled ? (
              <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Loader2 size={14} className="text-primary animate-spin" />
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="send"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.88 }}
                onClick={handleSubmit}
                disabled={!value.trim() || disabled}
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                  value.trim()
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'
                    : 'bg-secondary text-muted-foreground/50 cursor-not-allowed',
                )}
              >
                <Send size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Char count */}
      <AnimatePresence>
        {isNearLimit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute bottom-[-16px] right-1 text-[10px]',
              charCount >= MAX_CHARS ? 'text-destructive' : 'text-muted-foreground/50',
            )}
          >
            {charCount}/{MAX_CHARS}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
