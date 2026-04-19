import { useState } from 'react';

import { Plus } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Button, Checkbox, PageContent, ScrollArea, Stack,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Text,
} from '@ui';

import { useDeleteScript } from '../api/useDeleteScript';
import { useBatchRun, useRuns, useRunScript } from '../api/useRuns';
import { useSaveScript } from '../api/useSaveScript';
import { useSaveTestSuiteConfig } from '../api/useSaveTestSuiteConfig';
import { useFlakyTests, useRunHistory } from '../api/useTestSuiteAnalytics';
import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useStartWatch, useStopWatch, useWatchedScripts } from '../api/useWatchMode';
import { useLibraryFilters } from '../hooks/useLibraryFilters';
import { SPARKLINE_RUN_LIMIT, TAB } from '../lib/constants';
import { buildDefaultConfig, buildStarterTest } from '../lib/starter-test';
import { useTestSuiteStore } from '../test-suite-store';

import { DataRunDialog } from './DataRunDialog';
import { LibraryBulkActions } from './LibraryBulkActions';
import { LibraryScriptRow } from './LibraryScriptRow';
import { LibraryTagFilter } from './LibraryTagFilter';
import { LibraryToolbar } from './LibraryToolbar';
import { RunSparkline } from './RunSparkline';
import { ScheduleDialog } from './ScheduleDialog';

function ScriptSparkline({ scriptId }: { scriptId: string }) {
  const { data: history = [] } = useRunHistory(scriptId, SPARKLINE_RUN_LIMIT);
  return <RunSparkline results={history} />;
}

export function LibraryPanel() {
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

  return (
    <PageContent>
      <LibraryToolbar
        search={search}
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onNewTest={onNewTest}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
      />
      <LibraryTagFilter
        allTags={allTags}
        batchRunPending={batchRun.isPending}
        scripts={scripts}
        selectedTags={selectedTags}
        onRunTagged={(ids) => batchRun.mutate({ scriptIds: ids })}
        onToggleTag={toggleTag}
      />

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-20 text-center">Steps</TableHead>
              <TableHead className="w-28">Created</TableHead>
              <TableHead className="w-28">Updated</TableHead>
              <TableHead className="w-32">History</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((script) => (
              <LibraryScriptRow
                key={script.id}
                formatDate={formatDate}
                isFlaky={flakySet.has(script.id)}
                isSelected={selected.has(script.id)}
                isWatched={watchedSet.has(script.id)}
                script={script}
                sparkline={<ScriptSparkline scriptId={script.id} />}
                onDataRun={() => setDataRunScriptId(script.id)}
                onDelete={() => deleteScript.mutate(script.id)}
                onEdit={() => onEdit(script.id)}
                onRun={() => onRun(script.id)}
                onSchedule={() => setScheduleScriptId(script.id)}
                onToggleSelect={() => toggleSelect(script.id)}
                onToggleWatch={() =>
                  watchedSet.has(script.id)
                    ? stopWatch.mutate(script.id)
                    : startWatch.mutate(script.id)
                }
              />
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-text-muted" colSpan={7}>
                  {search ? (
                    'No matching tests'
                  ) : (
                    <Stack align="center" gap="md">
                      <Text>No tests recorded yet</Text>
                      <Button
                        data-testid="create-starter-test"
                        disabled={saveScript.isPending || saveConfig.isPending}
                        size="sm"
                        variant="outline"
                        onClick={() => void onCreateStarterTest()}
                      >
                        <Plus className="h-4 w-4" />
                        {config ? 'Create Starter Test' : 'Create Default Config + Starter Test'}
                      </Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </ScrollArea>

      <LibraryBulkActions
        batchRunPending={batchRun.isPending}
        selectedCount={selected.size}
        onDeleteSelected={() => { for (const id of selected) deleteScript.mutate(id); }}
        onRunSelected={() => batchRun.mutate({ scriptIds: Array.from(selected) })}
      />

      {scheduleScriptId && projectId ? (
        <ScheduleDialog
          open={!!scheduleScriptId}
          projectId={projectId}
          scriptId={scheduleScriptId}
          onOpenChange={(open) => { if (!open) setScheduleScriptId(null); }}
        />
      ) : null}
      {dataRunScriptId ? (
        <DataRunDialog
          open={!!dataRunScriptId}
          scriptId={dataRunScriptId}
          onOpenChange={(open) => { if (!open) setDataRunScriptId(null); }}
        />
      ) : null}
    </PageContent>
  );
}
