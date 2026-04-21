import { useCallback, useState } from 'react';

export function useUrlValidation() {
  const [urlError, setUrlError] = useState<string | null>(null);

  const validate = useCallback((url: string): boolean => {
    try {
      new URL(url);
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Enter a valid URL (e.g. http://localhost:3000)');
      return false;
    }
  }, []);

  return { urlError, setUrlError, validate };
}
