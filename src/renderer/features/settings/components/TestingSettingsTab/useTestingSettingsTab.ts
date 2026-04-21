/**
 * useTestingSettingsTab — logic hook for TestingSettingsTab
 */

import { useEffect, useState } from 'react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';

import { useDeleteTestSuiteConfig } from '@renderer/features/test-suite/api/useDeleteTestSuiteConfig';
import { useSaveTestSuiteConfig } from '@renderer/features/test-suite/api/useSaveTestSuiteConfig';
import { useSetActiveTestSuiteConfig } from '@renderer/features/test-suite/api/useSetActiveTestSuiteConfig';
import { useTestSuiteConfig } from '@renderer/features/test-suite/api/useTestSuiteConfig';
import { useTestSuiteConfigs } from '@renderer/features/test-suite/api/useTestSuiteConfigs';
import { useDebounce } from '@renderer/shared/hooks/useDebounce';
import { useLayoutStore } from '@renderer/shared/stores';

export type ScreenshotMode = TestSuiteConfig['screenshotMode'];

export interface EditableFields {
  targetUrl: string;
  testDirectory: string;
  viewportWidth: number;
  viewportHeight: number;
  screenshotMode: ScreenshotMode;
  saveScreenshotsToTemp: boolean;
}

function toBuffer(config: TestSuiteConfig): EditableFields {
  return {
    targetUrl: config.targetUrl,
    testDirectory: config.testDirectory,
    viewportWidth: config.viewportWidth,
    viewportHeight: config.viewportHeight,
    screenshotMode: config.screenshotMode,
    saveScreenshotsToTemp: config.saveScreenshotsToTemp,
  };
}

function bufferMatchesConfig(buffer: EditableFields, config: TestSuiteConfig): boolean {
  return (
    buffer.targetUrl === config.targetUrl &&
    buffer.testDirectory === config.testDirectory &&
    buffer.viewportWidth === config.viewportWidth &&
    buffer.viewportHeight === config.viewportHeight &&
    buffer.screenshotMode === config.screenshotMode &&
    buffer.saveScreenshotsToTemp === config.saveScreenshotsToTemp
  );
}

export function useTestingSettingsTab() {
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: config } = useTestSuiteConfig(activeProjectId);
  const save = useSaveTestSuiteConfig(activeProjectId ?? '');
  const { data: configs } = useTestSuiteConfigs(activeProjectId ?? '');
  const setActive = useSetActiveTestSuiteConfig(activeProjectId ?? '');
  const del = useDeleteTestSuiteConfig(activeProjectId ?? '');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [buffer, setBuffer] = useState<EditableFields | null>(
    config ? toBuffer(config) : null,
  );

  useEffect(() => {
    if (!config) return;
    setBuffer(toBuffer(config));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, config?.updatedAt]);

  const debouncedBuffer = useDebounce(buffer, 300);

  useEffect(() => {
    if (!debouncedBuffer || !config || !activeProjectId) return;
    if (bufferMatchesConfig(debouncedBuffer, config)) return;

    const merged: TestSuiteConfig = {
      ...config,
      ...debouncedBuffer,
      updatedAt: new Date().toISOString(),
    };
    save.mutate(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBuffer, config?.id, config?.updatedAt, activeProjectId]);

  function update<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setBuffer((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return {
    activeProjectId,
    config,
    buffer,
    configs,
    setActive,
    del,
    editingId,
    setEditingId,
    update,
  };
}
