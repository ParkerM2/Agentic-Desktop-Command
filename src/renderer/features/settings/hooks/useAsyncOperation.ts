/**
 * useAsyncOperation — reusable error-state wrapper for async calls
 *
 * Replaces the repeated useState<string | null> + try/catch + setError
 * pattern found in settings sub-panels and similar forms.
 */

import { useCallback, useState } from 'react';

export function useAsyncOperation() {
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  return { error, setError, execute };
}
