/**
 * useModalFormState — shared pattern for modal form fields that reset on open.
 *
 * Resets to defaults when dialog opens, optionally merging entity values
 * for edit-mode dialogs.
 */

import { useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useModalFormState<T extends Record<string, any>>(
  open: boolean,
  defaults: T,
  entity?: Partial<T>,
) {
  const [values, setValues] = useState<T>(defaults);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(entity ? { ...defaults, ...entity } : defaults);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when open changes
  }, [open]);

  const update = <K extends keyof T>(key: K, val: T[K]) =>
    setValues((v) => ({ ...v, [key]: val }));

  const reset = () => {
    setValues(defaults);
    setError(null);
  };

  return { values, setValues, error, setError, update, reset };
}
