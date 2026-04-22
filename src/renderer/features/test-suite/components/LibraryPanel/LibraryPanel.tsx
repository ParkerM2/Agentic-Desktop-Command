import { Plus } from 'lucide-react';

import {
  Button, Checkbox, PageContent, ScrollArea, Stack,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Text,
} from '@ui';

import { SPARKLINE_RUN_LIMIT } from '../../lib/constants';
import { DataRunDialog } from '../DataRunDialog';
import { LibraryBulkActions } from '../LibraryBulkActions';
import { LibraryScriptRow } from '../LibraryScriptRow';
import { LibraryTagFilter } from '../LibraryTagFilter';
import { LibraryToolbar } from '../LibraryToolbar';
import { RunSparkline } from '../RunSparkline';
import { ScheduleDialog } from '../ScheduleDialog';

import { useLibraryPanel, useRunHistory } from './useLibraryPanel';

function ScriptSparkline({ scriptId }: { scriptId: string }) {
  const { data: history = [] } = useRunHistory(scriptId, SPARKLINE_RUN_LIMIT);
  return <RunSparkline results={history} />;
}

export function LibraryPanel() {
  const vm = useLibraryPanel();

  return (
    <PageContent>
      <LibraryToolbar
        search={vm.search}
        statusCounts={vm.statusCounts}
        statusFilter={vm.statusFilter}
        onNewTest={vm.onNewTest}
        onSearchChange={vm.setSearch}
        onStatusFilterChange={vm.setStatusFilter}
      />
      <LibraryTagFilter
        allTags={vm.allTags}
        batchRunPending={vm.batchRunPending}
        scripts={vm.scripts}
        selectedTags={vm.selectedTags}
        onRunTagged={vm.onRunTagged}
        onToggleTag={vm.toggleTag}
      />

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={vm.selected.size === vm.filtered.length && vm.filtered.length > 0}
                  onCheckedChange={vm.toggleAll}
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
            {vm.filtered.map((script) => (
              <LibraryScriptRow
                key={script.id}
                formatDate={vm.formatDate}
                isFlaky={vm.flakySet.has(script.id)}
                isSelected={vm.selected.has(script.id)}
                isWatched={vm.watchedSet.has(script.id)}
                script={script}
                sparkline={<ScriptSparkline scriptId={script.id} />}
                onDataRun={() => vm.setDataRunScriptId(script.id)}
                onDelete={() => vm.onDeleteScript(script.id)}
                onEdit={() => vm.onEdit(script.id)}
                onRun={() => vm.onRun(script.id)}
                onSchedule={() => vm.setScheduleScriptId(script.id)}
                onToggleSelect={() => vm.toggleSelect(script.id)}
                onToggleWatch={() => vm.onToggleWatch(script.id)}
              />
            ))}
            {vm.filtered.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-text-muted" colSpan={7}>
                  {vm.search ? (
                    'No matching tests'
                  ) : (
                    <Stack align="center" gap="md">
                      <Text>No tests recorded yet</Text>
                      <Button
                        data-testid="create-starter-test"
                        disabled={vm.saveScriptPending || vm.saveConfigPending}
                        size="sm"
                        variant="outline"
                        onClick={() => void vm.onCreateStarterTest()}
                      >
                        <Plus className="h-4 w-4" />
                        {vm.config ? 'Create Starter Test' : 'Create Default Config + Starter Test'}
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
        batchRunPending={vm.batchRunPending}
        selectedCount={vm.selected.size}
        onDeleteSelected={vm.onDeleteSelected}
        onRunSelected={vm.onRunSelected}
      />

      {vm.scheduleScriptId && vm.projectId ? (
        <ScheduleDialog
          open={!!vm.scheduleScriptId}
          projectId={vm.projectId}
          scriptId={vm.scheduleScriptId}
          onOpenChange={(open) => { if (!open) vm.setScheduleScriptId(null); }}
        />
      ) : null}
      {vm.dataRunScriptId ? (
        <DataRunDialog
          open={!!vm.dataRunScriptId}
          scriptId={vm.dataRunScriptId}
          onOpenChange={(open) => { if (!open) vm.setDataRunScriptId(null); }}
        />
      ) : null}
    </PageContent>
  );
}
