/**
 * useDataLocationSection — logic hook for DataLocationSection
 */

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { PROJECTS } from '@shared/ipc/projects/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import {
  useConfirmDataDir,
  useDataLocation,
  useResetDataDir,
  useValidateDataDir,
} from '../../api/useDataLocation';

export interface ValidationCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export function useDataLocationSection() {
  const { data: dirInfo, isLoading } = useDataLocation();
  const validateDir = useValidateDataDir();
  const confirmDir = useConfirmDataDir();
  const resetDir = useResetDataDir();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [validationChecks, setValidationChecks] = useState<ValidationCheck[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const selectDirectory = useMutation({
    mutationFn: () => ipc(PROJECTS.SELECT.DIRECTORY, {}),
  });

  const hasFailures = validationChecks.some((c) => c.status === 'fail');
  const hasExistingDb = validationChecks.some(
    (c) => c.id === 'EXISTING_ADC_DB' && c.status === 'warn',
  );
  const canApply = selectedPath !== null && validationChecks.length > 0 && !hasFailures;

  async function handlePickDirectory() {
    setConfirmed(false);
    setValidationChecks([]);

    const result = await selectDirectory.mutateAsync();
    if (!result.path) return;

    setSelectedPath(result.path);

    const validation = await validateDir.mutateAsync(result.path);
    setValidationChecks(validation.checks);
  }

  async function handleApplyAndRestart(useExisting = false) {
    if (!selectedPath) return;
    await confirmDir.mutateAsync({ path: selectedPath, useExisting });
    setConfirmed(true);
  }

  async function handleReset() {
    const result = await resetDir.mutateAsync();
    setSelectedPath(null);
    setValidationChecks([]);
    if (result.requiresRestart) {
      setConfirmed(true);
    }
  }

  return {
    dirInfo,
    isLoading,
    selectDirectory,
    validateDir,
    confirmDir,
    resetDir,
    selectedPath,
    validationChecks,
    confirmed,
    hasFailures,
    hasExistingDb,
    canApply,
    handlePickDirectory,
    handleApplyAndRestart,
    handleReset,
  };
}
