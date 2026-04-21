import { useClipboardCopy } from '@renderer/shared/hooks/useClipboardCopy';

interface UseRunLogDialogProps {
  lines: Array<{ line: string; timestamp: string }>;
}

export function useRunLogDialog({ lines }: UseRunLogDialogProps) {
  const { copied, handleCopy: copy } = useClipboardCopy();

  const handleCopy = () => copy(lines.map((l) => l.line).join('\n'));

  return {
    copied,
    handleCopy,
  };
}
