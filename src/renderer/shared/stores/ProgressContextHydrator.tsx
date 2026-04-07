/**
 * ProgressContextHydrator — Syncs progress task data into the global store.
 *
 * Renders nothing. Place once in the root layout. On mount:
 * 1. Fetches all active tasks via IPC → seeds useProgressContext
 * 2. Subscribes to all progress events and keeps the store in sync
 * 3. Cleans up subscriptions on unmount
 */

import { useEffect } from 'react';

import type { EventPayload } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

import { useProgressContext } from './progress-context-store';

export function ProgressContextHydrator() {
  const setTasks = useProgressContext((s) => s.setTasks);
  const setLoading = useProgressContext((s) => s.setLoading);
  const upsertTask = useProgressContext((s) => s.upsertTask);
  const removeTask = useProgressContext((s) => s.removeTask);
  const setActiveSession = useProgressContext((s) => s.setActiveSession);
  const clearActiveSession = useProgressContext((s) => s.clearActiveSession);

  useEffect(() => {
    // ── Initial load ─────────────────────────────────────────
    void (async () => {
      try {
        const tasks = await ipc('progress.listTasks', {});
        setTasks(tasks);
      } catch {
        // Service unavailable — keep empty default
      } finally {
        setLoading(false);
      }
    })();

    // ── Event subscriptions ──────────────────────────────────

    const unsubCreated = window.api.on(
      'event:progress.taskCreated',
      (payload: EventPayload<'event:progress.taskCreated'>) => {
        upsertTask(payload.task);
      },
    );

    const unsubUpdated = window.api.on(
      'event:progress.taskUpdated',
      (payload: EventPayload<'event:progress.taskUpdated'>) => {
        upsertTask(payload.task);
      },
    );

    const unsubArchived = window.api.on(
      'event:progress.taskArchived',
      (payload: EventPayload<'event:progress.taskArchived'>) => {
        removeTask(payload.slug);
      },
    );

    const unsubActionStarted = window.api.on(
      'event:progress.actionStarted',
      (payload: EventPayload<'event:progress.actionStarted'>) => {
        setActiveSession(payload.slug, payload.sessionId, payload.action);
      },
    );

    const unsubActionCompleted = window.api.on(
      'event:progress.actionCompleted',
      (payload: EventPayload<'event:progress.actionCompleted'>) => {
        clearActiveSession(payload.slug);
        void (async () => {
          try {
            const task = await ipc('progress.getTask', { slug: payload.slug });
            if (task !== null) {
              upsertTask(task);
            }
          } catch {
            // Best-effort re-fetch
          }
        })();
      },
    );

    const unsubActionFailed = window.api.on(
      'event:progress.actionFailed',
      (payload: EventPayload<'event:progress.actionFailed'>) => {
        clearActiveSession(payload.slug);
        void (async () => {
          try {
            const task = await ipc('progress.getTask', { slug: payload.slug });
            if (task !== null) {
              upsertTask(task);
            }
          } catch {
            // Best-effort re-fetch
          }
        })();
      },
    );

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubArchived();
      unsubActionStarted();
      unsubActionCompleted();
      unsubActionFailed();
    };
  }, [
    setTasks,
    setLoading,
    upsertTask,
    removeTask,
    setActiveSession,
    clearActiveSession,
  ]);

  return null;
}
