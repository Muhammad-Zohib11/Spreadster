// ============================================================
// SPREADSTER — AI Pipeline Types
// Interfaces for the AI orchestration and prompt system
// ============================================================

import type { InstructionSet } from './operations.js';
import type { SpreadsheetContext } from './spreadsheet.js';

// --------------- AI Request / Response ---------------

export interface AIProcessRequest {
  prompt: string;
  conversationId?: string;
  spreadsheetContext: SpreadsheetContext;
  userId: string;
  sessionToken: string;
  options?: {
    model?: string;
    temperature?: number;
    maxRetries?: number;
    dryRun?: boolean;       // generate but don't execute
    enhancePrompt?: boolean; // auto-enhance prompt before sending to LLM
    safeMode?: boolean;      // extra validation pass before returning
  };
}

export interface AIProcessResponse {
  success: boolean;
  conversationId: string;
  messageId: string;
  instructionSet?: InstructionSet;
  enhancedPrompt?: string;
  explanation?: string;
  suggestions?: string[];  // follow-up prompt suggestions
  warnings?: string[];
  error?: string;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
}

export interface AIEnhanceRequest {
  rawPrompt: string;
  spreadsheetContext: SpreadsheetContext;
  userId: string;
  sessionToken: string;
}

export interface AIEnhanceResponse {
  enhancedPrompt: string;
  changes: string[];
  reasoning: string;
}

export interface AIModelsResponse {
  models: OllamaModel[];
  primary: string;
  fallback: string;
  ollamaOnline: boolean;
}

// --------------- Ollama Types ---------------

export interface OllamaModel {
  name: string;
  size: number; // bytes
  digest: string;
  modifiedAt: string;
  details?: {
    format: string;
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_ctx?: number;
    num_predict?: number;
    stop?: string[];
    repeat_penalty?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: OllamaGenerateRequest['options'];
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

// --------------- Prompt Engineering Types ---------------

export interface PromptContext {
  systemPrompt: string;
  userMessage: string;
  conversationHistory: OllamaChatMessage[];
  spreadsheetContextJson: string;
  operationSchemaJson: string;
}

export type CollegeRole =
  | 'admin'
  | 'principal'
  | 'hod'
  | 'teacher'
  | 'accounts'
  | 'registrar'
  | 'librarian'
  | 'it_staff';

export interface UserContext {
  userId: string;
  name: string;
  email: string;
  role: CollegeRole;
  department?: string;
  permissions: string[];
}

// --------------- Validation Types ---------------

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedInstructionSet?: InstructionSet;
}

export interface ValidationError {
  operationId?: string;
  operationType?: string;
  field?: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  operationId?: string;
  operationType?: string;
  message: string;
  code: string;
}

// --------------- Audit Log Types ---------------

export type AuditEventType =
  | 'AI_PROCESS'
  | 'OPERATION_EXECUTE'
  | 'OPERATION_ROLLBACK'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'SESSION_CREATED'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_FAILED'
  | 'AI_ERROR'
  | 'SYSTEM_ERROR';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  userId?: string;
  spreadsheetId?: string;
  instructionSetId?: string;
  executionId?: string;
  success: boolean;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}
