import { useState } from 'react';

import { Eye, EyeOff, MoreHorizontal, Play, Plus, Search, Trash2 } from 'lucide-react';

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
import { useFlakyTests, useRunHistory } from '../api/useTestSuiteAnalytics';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useStartWatch, useStopWatch, useWatchedScripts } from '../api/useWatchMode';
import { useTestSuiteStore } from '../test-suite-store';

import { RunSparkline } from './RunSparkline';

export function LibraryPanel() {
  const { projectId } = useLooseParams();
  const { data: scripts = [] } = useTestSuiteScripts(projectId);
  const { data: flakyTests = [] } = useFlakyTests(projectId);
  const flakySet = new Set(flakyTests.map((f) => f.scriptId));
  const { data: watchedScripts = [] } = useWatchedScripts();
  const startWatch = useStartWatch();
  const stopWatch = useStopWatch();
  const watchedSet = new Set(watchedScripts);
  const deleteScript = useDeleteScript(projectId ?? '');
  const setActiveTab = useTestSuiteStore((s) => s.setActiveTab);
  const setSelectedScriptId = useTestSuiteStore((s) => s.setSelectedScriptId);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = scripts.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

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

  const onEdit = (id: string) => {
    setSelectedScriptId(id);
    setActiveTab('recording');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <PageContent>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            className="pl-9"
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={onNewTest}>
          <Plus className="h-4 w-4" /> New Test
        </Button>
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
                    <Button size="icon" title="Run" variant="ghost">
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
                  {search ? 'No matching tests' : 'No tests recorded yet'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center gap-3 border-t border-border bg-bg-surface px-4 py-2">
          <span className="text-sm text-text-muted">{selected.size} selected</span>
          <Button size="sm" variant="ghost">
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
    </PageContent>
  );
}

function ScriptSparkline({ scriptId }: { scriptId: string }) {
  const { data: history = [] } = useRunHistory(scriptId, 10);
  return <RunSparkline results={history} />;
}
