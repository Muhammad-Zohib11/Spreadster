import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { OperationsHistory } from '@/components/operations/OperationsHistory';
import { SpreadsheetContextPanel } from '@/components/context/SpreadsheetContextPanel';
import { useSpreadsheetStore } from '@/stores/spreadsheetStore';
import { useAuthStore } from '@/stores/authStore';
import { Bot, History, TableProperties, LogOut, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'chat' | 'history' | 'context';

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'chat',    icon: Bot,             label: 'AI Chat'  },
  { id: 'history', icon: History,         label: 'History'  },
  { id: 'context', icon: TableProperties, label: 'Sheet'    },
];

export function AppLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const { spreadsheetContext, ollamaOnline, selectedModel } = useSpreadsheetStore();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">

      {/* ── Header ─────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0"
      >
        {/* Logo */}
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background bg-emerald-400" />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground tracking-tight leading-none">SPREADSTER</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {spreadsheetContext?.spreadsheetName ?? 'AI Spreadsheet Assistant'}
          </p>
        </div>

        {/* User + logout */}
        {user && (
          <button
            onClick={logout}
            title={`Sign out ${user.name}`}
            className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <LogOut size={13} />
          </button>
        )}
      </motion.header>

      {/* ── Tab Navigation ──────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 pb-2 flex-shrink-0">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              activeTab === id
                ? 'bg-primary/15 text-primary border border-primary/25 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80',
            )}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-3 flex-shrink-0" />

      {/* ── Main Content ────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="h-full flex flex-col"
            >
              <ChatPanel />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="h-full overflow-y-auto"
            >
              <OperationsHistory />
            </motion.div>
          )}
          {activeTab === 'context' && (
            <motion.div
              key="context"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="h-full overflow-y-auto"
            >
              <SpreadsheetContextPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Status Footer ───────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={cn('w-1.5 h-1.5 rounded-full', ollamaOnline ? 'bg-emerald-400' : 'bg-rose-400')} />
          <span className="text-[10px] text-muted-foreground">
            {ollamaOnline ? selectedModel ?? 'AI Online' : 'AI Offline'}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/40">v1.0</span>
      </div>
    </div>
  );
}
