// ============================================================
// SPREADSTER — AI Provider Service
// Unified interface for free cloud AI providers:
//   1. Google Gemini 2.0 Flash  (primary)
//   2. Groq — Llama 3.3 70B     (secondary)
//   3. OpenRouter free models    (tertiary)
//   4. Ollama local              (optional fallback)
//
// Add at least one API key to .env. Provider is auto-selected
// based on which keys are present, in priority order above.
// ============================================================
import { logger } from '../lib/logger.js';

// --------------- Types ---------------

export type AIProviderName = 'gemini' | 'groq' | 'openrouter' | 'ollama';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderChatResult {
  content: string;
  model: string;
  provider: AIProviderName;
  tokensUsed?: number;
}

export interface ProviderStatus {
  online: boolean;
  provider: AIProviderName | null;
  model: string | null;
  availableProviders: AIProviderName[];
}

// --------------- Config ---------------

const TEMPERATURE = parseFloat(process.env['AI_TEMPERATURE'] ?? process.env['OLLAMA_TEMPERATURE'] ?? '0.1');
const MAX_TOKENS = 4096;
const TIMEOUT_MS = parseInt(process.env['AI_TIMEOUT_MS'] ?? '60000', 10);

function env(key: string): string {
  return process.env[key] ?? '';
}

// --------------- Fetch with timeout ---------------

async function fetchJSON<T>(
  url: string,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// PROVIDER: Google Gemini
// Docs: https://ai.google.dev/api/generate-content
// Free tier: 15 RPM, 1M TPM/day, 1500 req/day (Gemini 2.0 Flash)
// ============================================================

interface GeminiPart { text: string }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }
interface GeminiResponse {
  candidates: Array<{ content: { parts: GeminiPart[]; role: string } }>;
  usageMetadata?: { totalTokenCount?: number };
  error?: { message: string };
}

async function chatGemini(messages: ChatMessage[], opts: ProviderChatOptions): Promise<ProviderChatResult> {
  const apiKey = env('GEMINI_API_KEY');
  const model = env('GEMINI_MODEL') || 'gemini-2.0-flash';

  // Separate system message from conversation
  const systemMsg = messages.find((m) => m.role === 'system');
  const conversationMsgs = messages.filter((m) => m.role !== 'system');

  // Convert to Gemini format: 'assistant' → 'model'
  const contents: GeminiContent[] = conversationMsgs.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Gemini requires alternating user/model turns — merge consecutive same-role messages
  const merged: GeminiContent[] = [];
  for (const msg of contents) {
    if (merged.length > 0 && merged[merged.length - 1]!.role === msg.role) {
      merged[merged.length - 1]!.parts.push(...msg.parts);
    } else {
      merged.push({ ...msg, parts: [...msg.parts] });
    }
  }

  // Ensure first message is from user
  if (merged.length === 0 || merged[0]!.role !== 'user') {
    merged.unshift({ role: 'user', parts: [{ text: 'Begin.' }] });
  }

  const body: Record<string, unknown> = {
    contents: merged,
    generationConfig: {
      temperature: opts.temperature ?? TEMPERATURE,
      maxOutputTokens: opts.maxTokens ?? MAX_TOKENS,
      responseMimeType: 'application/json', // Forces valid JSON output — key advantage of Gemini
    },
  };

  if (systemMsg) {
    body['systemInstruction'] = { parts: [{ text: systemMsg.content }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const data = await fetchJSON<GeminiResponse>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini returned empty response');

  return {
    content: text,
    model,
    provider: 'gemini',
    tokensUsed: data.usageMetadata?.totalTokenCount,
  };
}

// ============================================================
// PROVIDER: Groq (OpenAI-compatible)
// Docs: https://console.groq.com/docs/openai
// Free tier: 14,400 tokens/min, no daily cap on free tier
// ============================================================

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { total_tokens?: number };
  error?: { message: string };
  model?: string;
}

async function chatGroq(messages: ChatMessage[], opts: ProviderChatOptions): Promise<ProviderChatResult> {
  const apiKey = env('GROQ_API_KEY');
  const model = env('GROQ_MODEL') || 'llama-3.3-70b-versatile';

  const data = await fetchJSON<OpenAIResponse>(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? TEMPERATURE,
        max_tokens: opts.maxTokens ?? MAX_TOKENS,
        response_format: { type: 'json_object' }, // JSON mode
      }),
    },
  );

  if (data.error) throw new Error(`Groq error: ${data.error.message}`);
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Groq returned empty response');

  return {
    content,
    model,
    provider: 'groq',
    tokensUsed: data.usage?.total_tokens,
  };
}

// ============================================================
// PROVIDER: OpenRouter
// Docs: https://openrouter.ai/docs
// Free models: meta-llama/llama-3.1-8b-instruct:free, mistralai/mistral-7b-instruct:free
// ============================================================

async function chatOpenRouter(messages: ChatMessage[], opts: ProviderChatOptions): Promise<ProviderChatResult> {
  const apiKey = env('OPENROUTER_API_KEY');
  const model = env('OPENROUTER_MODEL') || 'meta-llama/llama-3.1-8b-instruct:free';

  const data = await fetchJSON<OpenAIResponse>(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://spreadster.vercel.app',
        'X-Title': 'SPREADSTER',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? TEMPERATURE,
        max_tokens: opts.maxTokens ?? MAX_TOKENS,
        // Note: not all free models support json_object mode, so we skip it
      }),
    },
  );

  if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`);
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('OpenRouter returned empty response');

  return {
    content,
    model,
    provider: 'openrouter',
    tokensUsed: data.usage?.total_tokens,
  };
}

// ============================================================
// PROVIDER: Ollama (local — optional fallback)
// ============================================================

async function chatOllama(messages: ChatMessage[], opts: ProviderChatOptions): Promise<ProviderChatResult> {
  const base = env('OLLAMA_BASE_URL') || 'http://localhost:11434';
  const model = env('OLLAMA_MODEL') || env('OLLAMA_PRIMARY_MODEL') || 'deepseek-coder:6.7b';

  interface OllamaResp { message: { content: string }; prompt_eval_count?: number; eval_count?: number }

  const data = await fetchJSON<OllamaResp>(
    `${base}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: opts.temperature ?? TEMPERATURE,
          num_predict: opts.maxTokens ?? MAX_TOKENS,
        },
      }),
    },
  );

  return {
    content: data.message.content,
    model,
    provider: 'ollama',
    tokensUsed: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
  };
}

// ============================================================
// Provider registry & auto-selection
// ============================================================

function getAvailableProviders(): AIProviderName[] {
  const available: AIProviderName[] = [];
  if (env('GEMINI_API_KEY')) available.push('gemini');
  if (env('GROQ_API_KEY')) available.push('groq');
  if (env('OPENROUTER_API_KEY')) available.push('openrouter');
  if (env('OLLAMA_BASE_URL')) available.push('ollama');
  return available;
}

const PROVIDER_FN: Record<AIProviderName, (m: ChatMessage[], o: ProviderChatOptions) => Promise<ProviderChatResult>> = {
  gemini: chatGemini,
  groq: chatGroq,
  openrouter: chatOpenRouter,
  ollama: chatOllama,
};

const PROVIDER_MODELS: Record<AIProviderName, string> = {
  gemini: env('GEMINI_MODEL') || 'gemini-2.0-flash',
  groq: env('GROQ_MODEL') || 'llama-3.3-70b-versatile',
  openrouter: env('OPENROUTER_MODEL') || 'meta-llama/llama-3.1-8b-instruct:free',
  ollama: env('OLLAMA_MODEL') || env('OLLAMA_PRIMARY_MODEL') || 'deepseek-coder:6.7b',
};

// ============================================================
// Public service
// ============================================================

export const aiProviderService = {
  /**
   * Chat with the best available provider.
   * Falls through the priority list on error.
   */
  async chat(messages: ChatMessage[], opts: ProviderChatOptions = {}): Promise<ProviderChatResult> {
    const providers = getAvailableProviders();
    if (providers.length === 0) {
      throw new Error(
        'No AI provider configured. Add GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY to your environment variables.',
      );
    }

    let lastError: unknown;
    for (const provider of providers) {
      try {
        logger.info({ provider, model: PROVIDER_MODELS[provider] }, 'Calling AI provider');
        const result = await PROVIDER_FN[provider](messages, opts);
        logger.info({ provider, tokensUsed: result.tokensUsed }, 'AI provider responded');
        return result;
      } catch (err) {
        logger.warn({ provider, err }, `AI provider "${provider}" failed — trying next`);
        lastError = err;
      }
    }

    throw new Error(`All AI providers failed. Last error: ${String(lastError)}`);
  },

  /**
   * Quick connectivity check — returns status of the primary provider
   */
  async getStatus(): Promise<ProviderStatus> {
    const available = getAvailableProviders();
    if (available.length === 0) {
      return { online: false, provider: null, model: null, availableProviders: [] };
    }

    const primary = available[0]!;
    try {
      // Send a minimal test request to verify the API key works
      const testMessages: ChatMessage[] = [
        { role: 'user', content: 'Reply with exactly: {"ok":true}' },
      ];
      await PROVIDER_FN[primary](testMessages, { maxTokens: 20, temperature: 0 });
      return {
        online: true,
        provider: primary,
        model: PROVIDER_MODELS[primary],
        availableProviders: available,
      };
    } catch {
      // Primary failed — still report as partially online if others exist
      return {
        online: available.length > 1,
        provider: available.length > 1 ? available[1]! : null,
        model: available.length > 1 ? PROVIDER_MODELS[available[1]!] : null,
        availableProviders: available,
      };
    }
  },

  /**
   * Returns the active provider name and model (without a live ping)
   */
  getActiveInfo(): { provider: AIProviderName | null; model: string | null; availableProviders: AIProviderName[] } {
    const available = getAvailableProviders();
    return {
      provider: available[0] ?? null,
      model: available[0] ? PROVIDER_MODELS[available[0]] : null,
      availableProviders: available,
    };
  },
};
