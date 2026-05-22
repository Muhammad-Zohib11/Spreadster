// ============================================================
// SPREADSTER — GAS Bridge Service
// Communicates from the React sidebar to Google Apps Script
// via google.script.run (the GAS ↔ HTML Service bridge)
// ============================================================
import type { InstructionSet, SpreadsheetContext } from '@spreadster/shared';
import { apiClient } from './api.client';

// Declare the GAS global (injected by Apps Script HTML Service)
declare const google: {
  script: {
    run: {
      withSuccessHandler: (fn: (result: unknown) => void) => typeof google.script.run;
      withFailureHandler: (fn: (err: Error) => void) => typeof google.script.run;
      executeInstructionSet: (json: string) => void;
      getSpreadsheetContext: () => void;
      applyRollback: (snapshotJson: string) => void;
      showToast: (message: string, title?: string) => void;
      gasAutoLogin: () => void;
      getEmail: () => void;
    };
  };
};

function callGAS<T>(method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2);
    let settled = false;

    const handler = (event: MessageEvent) => {
      const data = event.data as { __spreadster?: boolean; requestId?: string; result?: unknown; error?: string };
      if (!data?.__spreadster || data.requestId !== requestId) return;
      window.removeEventListener('message', handler);
      settled = true;
      if (data.error) reject(new Error(data.error));
      else resolve(data.result as T);
    };

    window.addEventListener('message', handler);

    // Send request to parent Sidebar.html which has google.script.run
    window.parent.postMessage(
      { __spreadster: true, action: method, requestId, payload: args[0], message: args[0], title: args[1] },
      '*'
    );

    // Timeout after 15s
    setTimeout(() => {
      if (!settled) {
        window.removeEventListener('message', handler);
        reject(new Error(`GAS call '${method}' timed out`));
      }
    }, 15000);
  });
}

// Check if we are running inside a GAS sidebar (URL has ?gas=true injected by Sidebar.html)
function isInsideGAS(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('gas') === 'true';
}

export const gasBridge = {
  /**
   * Execute an instruction set on the spreadsheet via GAS
   */
  async executeInstructionSet(
    instructionSet: InstructionSet,
  ): Promise<{
    success: boolean;
    operationsExecuted: number;
    operationsFailed: number;
    rollbackId?: string;
    error?: string;
  }> {
    if (!isInsideGAS()) {
      // Development mock
      console.log('[DEV] Would execute instruction set:', instructionSet);
      await new Promise((r) => setTimeout(r, 1500));
      return { success: true, operationsExecuted: instructionSet.operations.length, operationsFailed: 0 };
    }

    const start = Date.now();

    try {
      // 1. Get current spreadsheet snapshot for checkpoint
      const context = await this.getSpreadsheetContext();

      // 2. Save checkpoint to backend before executing
      const { checkpointId } = await apiClient.saveCheckpoint({
        spreadsheetId: context.spreadsheetId,
        sheets: [], // GAS will send sheets data inline
        batchId: instructionSet.id,
        description: instructionSet.summary,
      });

      // 3. Execute in GAS
      const result = await callGAS<{
        success: boolean;
        operationsExecuted: number;
        operationsFailed: number;
        error?: string;
        log?: unknown[];
      }>('executeInstructionSet', JSON.stringify(instructionSet));

      // 4. Report completion to backend
      await apiClient.completeBatch({
        batchId: instructionSet.id,
        success: result.success,
        operationsOk: result.operationsExecuted,
        operationsFailed: result.operationsFailed,
        durationMs: Date.now() - start,
        errorMessage: result.error,
        log: result.log,
      });

      return { ...result, rollbackId: checkpointId };
    } catch (err) {
      return {
        success: false,
        operationsExecuted: 0,
        operationsFailed: instructionSet.operations.length,
        error: String(err),
      };
    }
  },

  /**
   * Get current spreadsheet state from GAS
   */
  async getSpreadsheetContext(): Promise<SpreadsheetContext> {
    if (!isInsideGAS()) {
      // Return mock context for development
      return {
        spreadsheetId: 'dev-mock-id',
        spreadsheetName: 'Development Mock Sheet',
        spreadsheetUrl: 'https://docs.google.com',
        locale: 'en',
        timeZone: 'Asia/Karachi',
        activeSheetName: 'Sheet1',
        activeSheetIndex: 0,
        totalSheets: 1,
        sheets: [
          {
            sheetId: 1,
            name: 'Sheet1',
            index: 0,
            isHidden: false,
            frozenRows: 0,
            frozenColumns: 0,
            rowCount: 1000,
            columnCount: 26,
            lastRow: 10,
            lastColumn: 5,
            hasData: true,
            headers: ['Student ID', 'Name', 'Class', 'Marks', 'Grade'],
          },
        ],
        namedRanges: [],
      };
    }
    return callGAS<SpreadsheetContext>('getSpreadsheetContext');
  },

  /**
   * Apply a rollback snapshot
   */
  async applyRollback(checkpointId: string): Promise<void> {
    const { snapshot } = await apiClient.rollback({ checkpointId });
    if (isInsideGAS()) {
      await callGAS<void>('applyRollback', JSON.stringify(snapshot));
    }
  },

  /**
   * Show a toast notification inside Google Sheets
   */
  showToast(message: string, title = 'SPREADSTER'): void {
    if (isInsideGAS()) {
      google.script.run.showToast(message, title);
    }
  },

  /**
   * Auto-login using the GAS session identity (no OAuth popup).
   * Calls getEmail() in GAS, then hits the backend directly from React.
   */
  async gasAutoLogin(): Promise<{ success: boolean; token?: string; user?: { name: string; email: string; role: string }; error?: string }> {
    if (!isInsideGAS()) return { success: false, error: 'not in GAS' };
    try {
      // Step 1: Get user's email from GAS session (no UrlFetchApp needed)
      const email = await callGAS<string>('getEmail');
      if (!email) return { success: false, error: 'Could not get user email from GAS session' };

      // Step 2: Call backend directly from React using VITE env vars (already deployed to Vercel)
      const apiBase = (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'https://backend-rosy-five-71.vercel.app/api';
      const apiKey = (import.meta.env['VITE_API_KEY'] as string | undefined) ?? '';

      const res = await fetch(`${apiBase}/auth/gas-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ email }),
      });
      return (await res.json()) as { success: boolean; token?: string; user?: { name: string; email: string; role: string }; error?: string };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
