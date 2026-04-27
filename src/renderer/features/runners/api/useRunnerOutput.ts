import { useQueryClient } from '@tanstack/react-query';

import { RUNNERS_EVENTS } from '@shared/ipc/runners/channels';
import type {
  RunnerHealthEvent,
  RunnerOutputEvent,
  RunnerStatusEvent,
  ScopeRef,
} from '@shared/ipc/runners/schemas';

import { useIpcEvent } from '@renderer/shared/hooks';

import { useRunnersStore } from '../runners-store';

import { runnerKeys } from './queryKeys';

/** Subscribe to runner output, health, and status events and patch the query cache. */
export function useRunnerEvents(scope: ScopeRef): void {
  const appendOutput = useRunnersStore((s) => s.appendOutput);
  const setHealth = useRunnersStore((s) => s.setHealth);
  const qc = useQueryClient();

  useIpcEvent(RUNNERS_EVENTS.INSTANCE.OUTPUT, (evt: RunnerOutputEvent) => {
    appendOutput(evt);
  });

  useIpcEvent(RUNNERS_EVENTS.INSTANCE.HEALTH, (evt: RunnerHealthEvent) => {
    setHealth(evt);
  });

  useIpcEvent(RUNNERS_EVENTS.INSTANCE.STATUS, (_evt: RunnerStatusEvent) => {
    void qc.invalidateQueries({ queryKey: runnerKeys.instances(scope) });
  });
}
