// ============================================================
// SPREADSTER — Ollama Service
// Manages all communication with the local Ollama AI server
// ============================================================
import type {
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaModel,
} from '@spreadster/shared';
import { logger } from '../lib/logger.js';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
const TIMEOUT_MS = parseInt(process.env['OLLAMA_TIMEOUT_MS'] ?? '120000', 10);
const MAX_RETRIES = parseInt(process.env['OLLAMA_MAX_RETRIES'] ?? '3', 10);

// --------------- Internal Helpers ---------------

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 8000); // exp backoff, max 8s
        logger.warn({ attempt, delay, err }, 'Ollama request failed — retrying');
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// --------------- Public API ---------------

export const ollamaService = {
  /**
   * Check whether Ollama server is reachable
   */
  async ping(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' }, 5000);
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * List all locally available models
   */
  async listModels(): Promise<OllamaModel[]> {
    const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' }, 10000);
    if (!res.ok) throw new Error(`Ollama /api/tags failed: ${res.status}`);
    const data = (await res.json()) as { models: OllamaModel[] };
    return data.models ?? [];
  },

  /**
   * Raw generation (single prompt, no chat history)
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    return withRetry(async () => {
      const res = await fetchWithTimeout(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...request, stream: false }),
        },
        TIMEOUT_MS,
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama generate failed (${res.status}): ${body}`);
      }

      return res.json() as Promise<OllamaGenerateResponse>;
    });
  },

  /**
   * Chat completion with conversation history
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    return withRetry(async () => {
      const res = await fetchWithTimeout(
        `${OLLAMA_BASE_URL}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...request, stream: false }),
        },
        TIMEOUT_MS,
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama chat failed (${res.status}): ${body}`);
      }

      return res.json() as Promise<OllamaChatResponse>;
    });
  },

  /**
   * Pull a model if not already present
   */
  async pullModel(modelName: string): Promise<void> {
    logger.info({ modelName }, 'Pulling Ollama model');
    const res = await fetchWithTimeout(
      `${OLLAMA_BASE_URL}/api/pull`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: false }),
      },
      300_000, // 5 minutes for model download
    );
    if (!res.ok) throw new Error(`Failed to pull model ${modelName}: ${res.status}`);
  },

  /**
   * Select the best available model
   * Falls back through: primary → fallback → any available
   */
  async selectModel(): Promise<string> {
    const primary = process.env['OLLAMA_PRIMARY_MODEL'] ?? 'deepseek-coder:6.7b';
    const fallback = process.env['OLLAMA_FALLBACK_MODEL'] ?? 'qwen2.5-coder:7b';

    try {
      const models = await this.listModels();
      const names = models.map((m) => m.name);

      if (names.includes(primary)) return primary;
      if (names.includes(fallback)) return fallback;
      if (names.length > 0) {
        logger.warn(
          { primary, fallback, available: names },
          'Preferred models not found, using first available',
        );
        return names[0]!;
      }
    } catch (err) {
      logger.error({ err }, 'Failed to list Ollama models');
    }

    return primary; // attempt with primary anyway
  },
};
