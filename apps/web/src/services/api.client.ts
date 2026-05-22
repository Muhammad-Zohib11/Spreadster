// ============================================================
// SPREADSTER — API Client
// All HTTP calls to the SPREADSTER backend
// ============================================================
import { useAuthStore } from '@/stores/authStore';
import type { AIProcessResponse, SpreadsheetContext } from '@spreadster/shared';

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const API_KEY = import.meta.env['VITE_API_KEY'] ?? '';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Session expired — please log in again');
  }

  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data;
}

export const apiClient = {
  // ---- AI ----

  async processPrompt(
    prompt: string,
    spreadsheetContext: SpreadsheetContext,
    conversationId?: string,
  ): Promise<AIProcessResponse> {
    return request<AIProcessResponse>('/ai/process', {
      method: 'POST',
      body: JSON.stringify({ prompt, spreadsheetContext, conversationId }),
    });
  },

  async getAIStatus(): Promise<{ ollamaOnline: boolean; selectedModel: string }> {
    return request('/ai/status');
  },

  async getModels(): Promise<{ models: unknown[]; ollamaOnline: boolean }> {
    return request('/ai/models');
  },

  // ---- Operations ----

  async getOperations(limit = 20): Promise<{ batches: unknown[] }> {
    return request(`/operations?limit=${limit}`);
  },

  async getBatch(batchId: string): Promise<{ batch: unknown }> {
    return request(`/operations/${batchId}`);
  },

  async completeBatch(data: {
    batchId: string;
    success: boolean;
    operationsOk: number;
    operationsFailed: number;
    durationMs?: number;
    errorMessage?: string;
    log?: unknown[];
  }): Promise<void> {
    return request('/operations/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async saveCheckpoint(data: {
    spreadsheetId: string;
    sheets: unknown[];
    batchId?: string;
    description?: string;
  }): Promise<{ checkpointId: string }> {
    return request('/operations/checkpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async rollback(data: {
    checkpointId: string;
    batchId?: string;
  }): Promise<{ snapshot: unknown }> {
    return request('/operations/rollback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listCheckpoints(spreadsheetId: string): Promise<{ checkpoints: unknown[] }> {
    return request(`/operations/checkpoints/list?spreadsheetId=${spreadsheetId}`);
  },

  // ---- Auth ----

  async getMe(): Promise<{ user: unknown }> {
    return request('/auth/me');
  },

  async logout(): Promise<void> {
    return request('/auth/logout', { method: 'POST' });
  },

  // ---- Audit ----

  async getMyAuditLogs(limit = 50): Promise<{ logs: unknown[] }> {
    return request(`/audit/me?limit=${limit}`);
  },
};
