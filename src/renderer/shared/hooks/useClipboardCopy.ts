import { useCallback, useState } from 'react';

export function useClipboardCopy(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    },
    [timeout],
  );

  return { copied, handleCopy };
}
