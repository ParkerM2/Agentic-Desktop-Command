import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useClipboardCopy } from '@renderer/shared/hooks/useClipboardCopy';
import { ipc } from '@renderer/shared/lib/ipc';

interface UseResultsToolbarProps {
  copyText: string;
  runRecord?: { reportPath?: string } | null;
}

export function useResultsToolbar({ copyText, runRecord }: UseResultsToolbarProps) {
  const { copied, handleCopy: copy } = useClipboardCopy();

  const handleCopy = () => copy(copyText);

  const handleOpenReport = () => {
    void ipc(TEST_SUITE.OPEN.REPORT, { reportPath: runRecord?.reportPath ?? '' });
  };

  return {
    copied,
    handleCopy,
    handleOpenReport,
  };
}
