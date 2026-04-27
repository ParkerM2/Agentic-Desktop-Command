import { useState } from 'react';

import { useLooseParams } from '@renderer/shared/hooks';

import { useDeleteScript } from '../../api/useDeleteScript';
import { useBatchRun, useRuns, useRunScript } from '../../api/useRuns';
import { useSaveScript } from '../../api/useSaveScript';
import { useSaveTestSuiteConfig } from '../../api/useSaveTestSuiteConfig';
import { useFlakyTests, useRunHistory } from '../../api/useTestSuiteAnalytics';
import { useTestSuiteConfig } from '../../api/useTestSuiteConfig';
import { useTestSuiteScripts } from '../../api/useTestSuiteScripts';
import { useStartWatch, useStopWatch, useWatchedScripts } from '../../api/useWatchMode';
import { useLibraryFilters } from '../../hooks/useLibraryFilters';
import { TAB } from '../../lib/constants';
import { buildDefaultConfig, buildStarterTest } from '../../lib/starter-test';
import { useTestSuiteStore } from '../../test-suite-store';

export { useRunHistory };

export function useLibraryPanel() {
  const { projectId } = useLooseParams();
  const { data: scripts = [] } = useTestSuiteScripts(projectId);
  const { data: flakyTests = [] } = useFlakyTests(projectId);
  const flakySet = new Set(flakyTests.map((f) => f.scriptId));
  const { data: watchedScripts = [] } = useWatchedScripts();
  const { data: allRuns = [] } = useRuns();
  const { data: config } = useTestSuiteConfig(projectId);

  const startWatch = useStartWatch();
  const stopWatch = useStopWatch();
  const runScript = useRunScript();
  const batchRun = useBatchRun();
  const deleteScript = useDeleteScript(projectId ?? '');
  const saveScript = useSaveScript(projectId ?? '');
  const saveConfig = useSaveTestSuiteConfig(projectId ?? '');

  const watchedSet = new Set(watchedScripts);
  const setActiveTab = useTestSuiteStore((s) => s.setActiveTab);
  const setSelectedScriptId = useTestSuiteStore((s) => s.setSelectedScriptId);
  const statusFilter = useTestSuiteStore((s) => s.libraryStatusFilter);
  const setStatusFilter = useTestSuiteStore((s) => s.setLibraryStatusFilter);

  const [scheduleScriptId, setScheduleScriptId] = useState<string | null>(null);
  const [dataRunScriptId, setDataRunScriptId] = useState<string | null>(null);

  const {
    allTags, filtered, formatDate, search, selected, selectedTags,
    setSearch, statusCounts, toggleAll, toggleSelect, toggleTag,
  } = useLibraryFilters({ allRuns, flakySet, scripts, statusFilter });

  const onNewTest = () => {
    setSelectedScriptId(null);
    setActiveTab(TAB.RECORDING);
  };

  const onCreateStarterTest = async () => {
    if (!projectId) return;
    const resolvedConfig = config ?? (await saveConfig.mutateAsync(buildDefaultConfig()));
    await saveScript.mutateAsync(
      buildStarterTest({ projectId, targetUrl: resolvedConfig.targetUrl }),
    );
  };

  const onEdit = (id: string) => {
    setSelectedScriptId(id);
    setActiveTab(TAB.RECORDING);
  };

  const onRun = (scriptId: string) => {
    setSelectedScriptId(scriptId);
    runScript.mutate({ scriptId }, { onSuccess: () => setActiveTab(TAB.RESULTS) });
  };

  const onToggleWatch = (scriptId: string) => {
    if (watchedSet.has(scriptId)) {
      stopWatch.mutate(scriptId);
    } else {
      startWatch.mutate(scriptId);
    }
  };

  const onDeleteSelected = () => {
    for (const id of selected) deleteScript.mutate(id);
  };

  const onRunSelected = () => {
    batchRun.mutate({ scriptIds: Array.from(selected) });
  };

  const onRunTagged = (ids: string[]) => {
    batchRun.mutate({ scriptIds: ids });
  };

  return {
    projectId,
    scripts,
    flakySet,
    watchedSet,
    config,
    batchRunPending: batchRun.isPending,
    saveScriptPending: saveScript.isPending,
    saveConfigPending: saveConfig.isPending,
    scheduleScriptId,
    setScheduleScriptId,
    dataRunScriptId,
    setDataRunScriptId,
    allTags,
    filtered,
    formatDate,
    search,
    selected,
    selectedTags,
    setSearch,
    statusCounts,
    statusFilter,
    setStatusFilter,
    toggleAll,
    toggleSelect,
    toggleTag,
    onNewTest,
    onCreateStarterTest,
    onEdit,
    onRun,
    onToggleWatch,
    onDeleteSelected,
    onRunSelected,
    onRunTagged,
    onDeleteScript: (id: string) => deleteScript.mutate(id),
  };
}
