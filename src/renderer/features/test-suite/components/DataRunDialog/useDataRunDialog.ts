import { useState } from 'react';

import { useExecuteDataRun, useParseDataFile } from '../../api/useDataRun';
import { useMutationWithDialogClose } from '../../hooks/useMutationWithDialogClose';

interface UseDataRunDialogProps {
  scriptId: string;
  onOpenChange: (open: boolean) => void;
}

export function useDataRunDialog({ scriptId, onOpenChange }: UseDataRunDialogProps) {
  const [filePath, setFilePath] = useState('');
  const parseFile = useParseDataFile();
  const executeRun = useExecuteDataRun();
  const { handleMutate, isPending } = useMutationWithDialogClose(
    executeRun,
    () => onOpenChange(false),
  );

  const handleParse = () => {
    if (!filePath.trim()) return;
    parseFile.mutate(filePath.trim());
  };

  const handleExecute = () => handleMutate({ scriptId, dataFilePath: filePath.trim() });

  const parsed = parseFile.data;

  return {
    filePath,
    setFilePath,
    parsed,
    executing: isPending,
    handleParse,
    handleExecute,
  };
}
