import { useState } from 'react';

interface UseRunLogDialogProps {
  lines: Array<{ line: string; timestamp: string }>;
}

export function useRunLogDialog({ lines }: UseRunLogDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = lines.map((l) => l.line).join('\n');
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
    copied,
    handleCopy,
  };
}
