import { useState } from 'react';

import {
  Calendar,
  Eye,
  EyeOff,
  FileSpreadsheet,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  PageContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui';

import { useDeleteScript } from '../api/useDeleteScript';
import { useSaveScript } from '../api/useSaveScript';
import { useSaveTestSuiteConfig } from '../api/useSaveTestSuiteConfig';
import { useFlakyTests, useRunHistory } from '../api/useTestSuiteAnalytics';
import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useAllTestSuiteRuns } from '../api/useTestSuiteRuns';
import { useRunScript } from '../api/useRuns';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useStartWatch, useStopWatch, useWatchedScripts } from '../api/useWatchMode';
import { buildDefaultConfig, buildStarterTest } from '../lib/starter-test';
import { useTestSuiteStore } from '../test-suite-store';

import { DataRunDialog } from './DataRunDialog';
import { RunSparkline } from './RunSparkline';
import { ScheduleDialog } from './ScheduleDialog';

const FILTER_LABELS = {
  all: 'All',
  passed: 'Passed',
  failed: 'Failed',
  flaky: 'Flaky',
  'no-runs': 'No runs',
} as const;

export function LibraryPanel() {
  const { projectId } = useLooseParams();
  const { data: scripts = [] } = useTestSuiteScripts(projectId);
  const { data: flakyTests = [] } = useFlakyTests(projectId);
  const flakySet = new Set(flakyTests.map((f) => f.scriptId));
  const { data: watchedScripts = [] } = useWatchedScripts();
  const startWatch = useStartWatch();
  const stopWatch = useStopWatch();
  const runScript = useRunScript();
  const watchedSet = new Set(watchedScripts);
  const deleteScript = useDeleteScript(projectId ?? '');
  const saveScript = useSaveScript(projectId ?? '');
  const saveConfig = useSaveTestSuiteConfig(projectId ?? '');
  const { data: config } = useTestSuiteConfig(projectId);
  const setActiveTab = useTestSuiteStore((s) => s.setActiveTab);
  const setSelectedScriptId = useTestSuiteStore((s) => s.setSelectedScriptId);
  const statusFilter = useTestSuiteStore((s) => s.libraryStatusFilter);
  const setStatusFilter = useTestSuiteStore((s) => s.setLibraryStatusFilter);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleScriptId, setScheduleScriptId] = useState<string | null>(null);
  const [dataRunScriptId, setDataRunScriptId] = useState<string | null>(null);

  const { data: allRuns = [] } = useAllTestSuiteRuns();
  const latestStartByScript = new Map<string, string>();
  const lastStatusByScript = new Map<string, string>();
  for (const run of allRuns) {
    const prevStart = latestStartByScript.get(run.scriptId);
    if (!prevStart || run.startedAt > prevStart) {
      latestStartByScript.set(run.scriptId, run.startedAt);
      lastStatusByScript.set(run.scriptId, run.status);
    }
  }
  const getLastStatus = (scriptId: string): string | undefined =>
    lastStatusByScript.get(scriptId);

  const matchesSearch = (name: string) =>
    name.toLowerCase().includes(search.toLowerCase());

  const statusCounts = {
    all: scripts.filter((s) => matchesSearch(s.name)).length,
    passed: scripts.filter(
      (s) => matchesSearch(s.name) && getLastStatus(s.id) === 'passed',
    ).length,
    failed: scripts.filter(
      (s) => matchesSearch(s.name) && getLastStatus(s.id) === 'failed',
    ).length,
    flaky: scripts.filter(
      (s) => matchesSearch(s.name) && flakySet.has(s.id),
    ).length,
    'no-runs': scripts.filter(
      (s) => matchesSearch(s.name) && !getLastStatus(s.id),
    ).length,
  };

  const filtered = scripts.filter((s) => {
    if (!matchesSearch(s.name)) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'flaky') return flakySet.has(s.id);
    if (statusFilter === 'no-runs') return !getLastStatus(s.id);
    return getLastStatus(s.id) === statusFilter;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  };

  const onNewTest = () => {
    setSelectedScriptId(null);
    setActiveTab('recording');
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
    setActiveTab('recording');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <PageContent>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              className="pl-9"
              data-testid="test-suite-search"
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={onNewTest}>
            <Plus className="h-4 w-4" /> New Test
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'passed', 'failed', 'flaky', 'no-runs'] as const).map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={statusFilter === filter ? 'primary' : 'outline'}
              onClick={() => setStatusFilter(filter)}
            >
              {`${FILTER_LABELS[filter]} (${statusCounts[filter]})`}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
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
              <TableRow key={script.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(script.id)}
                    onCheckedChange={() => toggleSelect(script.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {script.name}
                  {flakySet.has(script.id) ? (
                    <Badge className="ml-2" variant="secondary">
                      flaky
                    </Badge>
                  ) : null}
                  {script.description ? (
                    <span className="ml-2 text-sm text-text-muted">{script.description}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-center">
                  <Badge size="sm" variant="secondary">
                    {script.steps.length}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-text-muted">
                  {formatDate(script.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-text-muted">
                  {formatDate(script.updatedAt)}
                </TableCell>
                <TableCell>
                  <ScriptSparkline scriptId={script.id} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      title="Run"
                      variant="ghost"
                      onClick={() => runScript.mutate({ scriptId: script.id })}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      title={watchedSet.has(script.id) ? 'Stop watching' : 'Watch for changes'}
                      variant="ghost"
                      onClick={() =>
                        watchedSet.has(script.id)
                          ? stopWatch.mutate(script.id)
                          : startWatch.mutate(script.id)
                      }
                    >
                      {watchedSet.has(script.id) ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(script.id)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setScheduleScriptId(script.id)}>
                          <Calendar className="mr-2 h-4 w-4" /> Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDataRunScriptId(script.id)}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" /> Data-Driven Run
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteScript.mutate(script.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-text-muted" colSpan={7}>
                  {search ? (
                    'No matching tests'
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <span>No tests recorded yet</span>
                      <Button
                        data-testid="create-starter-test"
                        disabled={saveScript.isPending || saveConfig.isPending}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void onCreateStarterTest();
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        {config ? 'Create Starter Test' : 'Create Default Config + Starter Test'}
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center gap-3 border-t border-border bg-bg-surface px-4 py-2">
          <span className="text-sm text-text-muted">{selected.size} selected</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              for (const id of selected) runScript.mutate({ scriptId: id });
            }}
          >
            <Play className="h-3 w-3" /> Run Selected
          </Button>
          <Button
            className="text-destructive"
            size="sm"
            variant="ghost"
            onClick={() => {
              for (const id of selected) deleteScript.mutate(id);
              setSelected(new Set());
            }}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>
      ) : null}

      {scheduleScriptId && projectId ? (
        <ScheduleDialog
          open={!!scheduleScriptId}
          projectId={projectId}
          scriptId={scheduleScriptId}
          onOpenChange={(open) => {
            if (!open) setScheduleScriptId(null);
          }}
        />
      ) : null}
      {dataRunScriptId ? (
        <DataRunDialog
          open={!!dataRunScriptId}
          scriptId={dataRunScriptId}
          onOpenChange={(open) => {
            if (!open) setDataRunScriptId(null);
          }}
        />
      ) : null}
    </PageContent>
  );
}

function ScriptSparkline({ scriptId }: { scriptId: string }) {
  const { data: history = [] } = useRunHistory(scriptId, 10);
  return <RunSparkline results={history} />;
}
