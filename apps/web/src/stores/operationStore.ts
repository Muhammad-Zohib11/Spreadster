import { create } from 'zustand';
import { apiClient } from '@/services/api.client';

interface OperationBatch {
  id: string;
  status: string;
  operationsTotal: number;
  operationsOk: number;
  operationsFailed: number;
  promptRaw: string;
  aiModel: string;
  durationMs?: number;
  spreadsheetName: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface OperationState {
  isExecuting: boolean;
  batches: OperationBatch[];
  setExecuting: (v: boolean) => void;
  loadBatches: () => Promise<void>;
  addBatch: (batch: OperationBatch) => void;
}

export const useOperationStore = create<OperationState>()((set) => ({
  isExecuting: false,
  batches: [],

  setExecuting(v) {
    set({ isExecuting: v });
  },

  async loadBatches() {
    try {
      const data = await apiClient.getOperations();
      if (data.batches) set({ batches: data.batches as OperationBatch[] });
    } catch {
      // silently fail — not critical
    }
  },

  addBatch(batch) {
    set((state) => ({ batches: [batch, ...state.batches] }));
  },
}));
