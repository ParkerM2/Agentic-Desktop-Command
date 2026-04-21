import { useEffect, useState } from 'react';

export function useFormWithReset<T>(defaults: T, open: boolean, deps: unknown[] = []) {
  const [values, setValues] = useState(defaults);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(defaults);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ...deps]);

  const update = <K extends keyof T>(key: K, val: T[K]) =>
    setValues((v) => ({ ...v, [key]: val }));

  return { values, setValues, error, setError, update };
}
