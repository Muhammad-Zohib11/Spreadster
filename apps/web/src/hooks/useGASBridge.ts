import { useCallback, useEffect } from 'react';
import { gasBridge } from '@/services/gas.bridge';
import { useSpreadsheetStore } from '@/stores/spreadsheetStore';
import { apiClient } from '@/services/api.client';
import type { InstructionSet } from '@spreadster/shared';

export function useGASBridge() {
  const { setSpreadsheetContext, setOllamaStatus } = useSpreadsheetStore();

  // Load spreadsheet context on mount
  useEffect(() => {
    (async () => {
      try {
        const ctx = await gasBridge.getSpreadsheetContext();
        setSpreadsheetContext(ctx);
      } catch {
        // Will retry on next render
      }
    })();
  }, [setSpreadsheetContext]);

  // Check Ollama status on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await apiClient.getAIStatus();
        setOllamaStatus(status.ollamaOnline, status.selectedModel);
      } catch {
        setOllamaStatus(false);
      }
    })();
  }, [setOllamaStatus]);

  const executeInstructionSet = useCallback(
    async (instructionSet: InstructionSet) => {
      const result = await gasBridge.executeInstructionSet(instructionSet);
      // Refresh context after execution
      try {
        const ctx = await gasBridge.getSpreadsheetContext();
        setSpreadsheetContext(ctx);
      } catch {
        // non-critical
      }
      return result;
    },
    [setSpreadsheetContext],
  );

  const rollback = useCallback(
    async (checkpointId: string) => {
      await gasBridge.applyRollback(checkpointId);
      // Refresh context after rollback
      try {
        const ctx = await gasBridge.getSpreadsheetContext();
        setSpreadsheetContext(ctx);
      } catch {
        // non-critical
      }
    },
    [setSpreadsheetContext],
  );

  return { executeInstructionSet, rollback };
}
