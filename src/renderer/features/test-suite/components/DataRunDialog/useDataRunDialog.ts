import { useState } from 'react';

import { useExecuteDataRun, useParseDataFile } from '../../api/useDataRun';

interface UseDataRunDialogProps {
  scriptId: string;
  onOpenChange: (open: boolean) => void;
}

export function useDataRunDialog({ scriptId, onOpenChange }: UseDataRunDialogProps) {
  const [filePath, setFilePath] = useState('');
  const parseFile = useParseDataFile();
  const executeRun = useExecuteDataRun();

  const handleParse = () => {
    if (!filePath.trim()) return;
    parseFile.mutate(filePath.trim());
  };

  const handleExecute = () => {
    executeRun.mutate(
      { scriptId, dataFilePath: filePath.trim() },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const parsed = parseFile.data;

  return {
    filePath,
    setFilePath,
    parsed,
    executing: executeRun.isPending,
    handleParse,
    handleExecute,
  };
}
