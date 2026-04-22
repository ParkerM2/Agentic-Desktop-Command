/**
 * useBooleanSettingsSync — local boolean state synced from server settings
 *
 * Maintains local state for each field so the UI is optimistic,
 * while syncing from the query data when it changes on the server side.
 */

import { useEffect, useState } from 'react';

export function useBooleanSettingsSync<K extends string>(
  fields: readonly K[],
  source: Partial<Record<K, boolean>> | undefined,
  defaults: Record<K, boolean>,
): Record<K, boolean> & { setField: (key: K, value: boolean) => void } {
  const [state, setState] = useState<Record<K, boolean>>(() => {
    const initial = {} as Record<K, boolean>;
    for (const key of fields) {
      initial[key] = defaults[key];
    }
    return initial;
  });

  useEffect(() => {
    if (!source) return;
    setState((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of fields) {
        const value = source[key] ?? defaults[key];
        if (next[key] !== value) {
          next[key] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [source, fields, defaults]);

  const setField = (key: K, value: boolean) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  return { ...state, setField } as Record<K, boolean> & { setField: (key: K, value: boolean) => void };
}
