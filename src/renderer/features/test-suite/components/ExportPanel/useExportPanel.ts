import { useCallback, useState } from 'react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useLooseParams } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';
import { useToastStore } from '@renderer/shared/stores/toast-store';

import { useTestSuiteConfig } from '../../api/useTestSuiteConfig';
import { useTestSuiteScripts } from '../../api/useTestSuiteScripts';

export function useExportPanel() {
  const { projectId } = useLooseParams();
  const { data: config } = useTestSuiteConfig(projectId);
  const { data: scripts } = useTestSuiteScripts(projectId);

  const [yamlPreview, setYamlPreview] = useState('');
  const [filePath, setFilePath] = useState('');
  const [fileExists, setFileExists] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const rawTestDir = config?.testDirectory ?? 'tests/e2e';
  const testDir = rawTestDir.replace(/\/+$/, '');
  const scriptCount = scripts?.length ?? 0;

  const addToast = useToastStore((s) => s.addToast);

  const handlePreview = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await ipc(TEST_SUITE.EXPORT['CI-PREVIEW'], { projectId });
      setYamlPreview(result.yaml);
      setFilePath(result.filePath);
      setFileExists(result.exists);
      setDialogOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addToast(`Failed to preview CI workflow: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, addToast]);

  const handleCommit = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await ipc(TEST_SUITE.EXPORT['CI-COMMIT'], { projectId });
      if (result.committed) {
        setCommitted(true);
        setFilePath(result.filePath);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addToast(`Failed to commit CI workflow: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, addToast]);

  return {
    projectId,
    testDir,
    scriptCount,
    yamlPreview,
    filePath,
    fileExists,
    dialogOpen,
    setDialogOpen,
    committed,
    loading,
    handlePreview,
    handleCommit,
  };
}
