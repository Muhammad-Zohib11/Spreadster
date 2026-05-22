import { create } from 'zustand';
import type { SpreadsheetContext } from '@spreadster/shared';

interface SpreadsheetState {
  spreadsheetContext: SpreadsheetContext | null;
  ollamaOnline: boolean;
  selectedModel: string | null;
  setSpreadsheetContext: (ctx: SpreadsheetContext) => void;
  setOllamaStatus: (online: boolean, model?: string) => void;
}

export const useSpreadsheetStore = create<SpreadsheetState>()((set) => ({
  spreadsheetContext: null,
  ollamaOnline: false,
  selectedModel: null,

  setSpreadsheetContext(ctx) {
    set({ spreadsheetContext: ctx });
  },

  setOllamaStatus(online, model) {
    set({ ollamaOnline: online, selectedModel: model ?? null });
  },
}));
