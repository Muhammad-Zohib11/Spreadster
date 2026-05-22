import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '@/services/api.client';
import type { InstructionSet } from '@spreadster/shared';
import { useSpreadsheetStore } from './spreadsheetStore';

interface ExecutionResult {
  success: boolean;
  operationsExecuted: number;
  operationsFailed: number;
  rollbackId?: string;
  error?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  instructionSet?: InstructionSet;
  executionResult?: ExecutionResult;
  warnings?: string[];
  latencyMs?: number;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  conversationId: string | null;
  addUserMessage: (prompt: string) => Promise<void>;
  addAssistantMessage: (message: Omit<Message, 'id' | 'role' | 'timestamp'>) => void;
  updateLastMessage: (instructionSetId: string, patch: Partial<Message>) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isLoading: false,
  conversationId: null,

  async addUserMessage(prompt) {
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isLoading: true,
    }));

    try {
      const spreadsheetContext = useSpreadsheetStore.getState().spreadsheetContext;
      if (!spreadsheetContext) {
        set((state) => ({
          isLoading: false,
          messages: [
            ...state.messages,
            {
              id: uuidv4(),
              role: 'assistant',
              content: '⚠️ No spreadsheet context loaded. Please open a Google Sheet first.',
              timestamp: new Date().toISOString(),
            },
          ],
        }));
        return;
      }

      const result = await apiClient.processPrompt(
        prompt,
        spreadsheetContext,
        get().conversationId ?? undefined,
      );

      if (result.conversationId) {
        set({ conversationId: result.conversationId });
      }

      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: result.explanation ?? result.instructionSet?.summary ?? (result.error ?? 'Something went wrong'),
        timestamp: new Date().toISOString(),
        instructionSet: result.instructionSet,
        warnings: result.warnings,
        latencyMs: result.latencyMs,
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isLoading: false,
      }));
    } catch (err) {
      set((state) => ({
        isLoading: false,
        messages: [
          ...state.messages,
          {
            id: uuidv4(),
            role: 'assistant',
            content: `Error: ${String(err)}`,
            timestamp: new Date().toISOString(),
          },
        ],
      }));
    }
  },

  addAssistantMessage(message) {
    set((state) => ({
      messages: [
        ...state.messages,
        { id: uuidv4(), role: 'assistant', timestamp: new Date().toISOString(), ...message },
      ],
    }));
  },

  updateLastMessage(instructionSetId, patch) {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.instructionSet?.id === instructionSetId ? { ...msg, ...patch } : msg,
      ),
    }));
  },

  clearMessages() {
    set({ messages: [], conversationId: null });
  },
}));
