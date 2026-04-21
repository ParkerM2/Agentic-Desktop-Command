import { useState } from 'react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

interface UseResultsToolbarProps {
  copyText: string;
  runRecord?: { reportPath?: string } | null;
}

export function useResultsToolbar({ copyText, runRecord }: UseResultsToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenReport = () => {
    void ipc(TEST_SUITE.OPEN.REPORT, { reportPath: runRecord?.reportPath ?? '' });
  };

  return {
    copied,
    handleCopy,
    handleOpenReport,
  };
}
