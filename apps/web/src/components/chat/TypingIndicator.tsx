import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="flex gap-2.5 mb-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent flex items-center justify-center">
        <span className="text-[10px]">🤖</span>
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}
