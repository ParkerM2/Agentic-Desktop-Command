import { Pencil, Play, RotateCw, Square } from 'lucide-react';

import type { ScopeRef } from '@shared/ipc/runners/schemas';

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import { ProfileEditDialog } from '../ProfileEditDialog';
import { RunnerOutputConsole } from '../RunnerOutputConsole';
import { RunnerStatusChip } from '../RunnerStatusChip';

import { useRunnerPanel } from './useRunnerPanel';

interface Props {
  scope: ScopeRef;
  heading?: string;
}

export function RunnerPanel({ scope, heading = 'Dev Server' }: Props) {
  const {
    profiles,
    activeInstance,
    selectedProfile,
    selectedProfileId,
    editing,
    scopeLabel,
    startDisabledReason,
    consoleHint,
    start,
    stop,
    restart,
    setSelectedProfileId,
    setEditing,
  } = useRunnerPanel({ scope });

  return (
    <div className="flex flex-col rounded-md border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">{heading}</h3>
        <span className="text-xs text-text-muted">({scopeLabel})</span>

        <Select value={selectedProfileId ?? ''} onValueChange={setSelectedProfileId}>
          <SelectTrigger className="h-7 w-48">
            <SelectValue
              placeholder={profiles.length === 0 ? 'No profiles' : 'Select profile…'}
            />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeInstance ? (
          <>
            <RunnerStatusChip status={activeInstance.status} />
            <Button size="sm" variant="ghost" onClick={() => restart.mutate(activeInstance.id)}>
              <RotateCw className="h-3 w-3" /> Restart
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => stop.mutate(activeInstance.id)}
            >
              <Square className="h-3 w-3" /> Stop
            </Button>
          </>
        ) : (
          <Button
            disabled={!selectedProfileId || start.isPending}
            size="sm"
            title={startDisabledReason}
            onClick={() => {
              if (selectedProfileId) start.mutate(selectedProfileId);
            }}
          >
            <Play className="h-3 w-3" /> Start
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing({ open: true, id: selectedProfileId })}
          >
            <Pencil className="h-3 w-3" />
            {selectedProfile ? 'Edit' : 'New'}
          </Button>
        </div>
      </div>

      <RunnerOutputConsole hint={consoleHint} instanceId={activeInstance?.id} />

      <ProfileEditDialog
        initial={profiles.find((p) => p.id === editing.id)}
        open={editing.open}
        projectId={scope.projectId}
        onOpenChange={(open) => setEditing({ open, id: editing.id })}
      />
    </div>
  );
}
