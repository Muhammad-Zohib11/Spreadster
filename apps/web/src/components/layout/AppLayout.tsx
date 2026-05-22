import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { OperationsHistory } from '@/components/operations/OperationsHistory';
import { SpreadsheetContextPanel } from '@/components/context/SpreadsheetContextPanel';
import { StatusBar } from '@/components/layout/StatusBar';
import { useSpreadsheetStore } from '@/stores/spreadsheetStore';
import { Bot, History, Database, Settings } from 'lucide-react';

export function AppLayout() {
  const [activeTab, setActiveTab] = useState('chat');
  const { spreadsheetContext } = useSpreadsheetStore();

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
            <span className="text-[9px] font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-xs font-semibold text-foreground">SPREADSTER</span>
        </div>
        {spreadsheetContext && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[140px]">
            <Database size={9} />
            <span className="truncate">{spreadsheetContext.spreadsheetName}</span>
          </div>
        )}
      </motion.header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-3 mt-2 mb-0 h-8 flex-shrink-0">
          <TabsTrigger value="chat" className="flex-1 text-xs gap-1">
            <Bot size={11} />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-xs gap-1">
            <History size={11} />
            History
          </TabsTrigger>
          <TabsTrigger value="context" className="flex-1 text-xs gap-1">
            <Settings size={11} />
            Sheet
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <TabsContent value="chat" className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ChatPanel />
            </TabsContent>

            <TabsContent value="history" className="h-full mt-0 overflow-y-auto">
              <OperationsHistory />
            </TabsContent>

            <TabsContent value="context" className="h-full mt-0 overflow-y-auto">
              <SpreadsheetContextPanel />
            </TabsContent>
          </AnimatePresence>
        </div>
      </Tabs>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
