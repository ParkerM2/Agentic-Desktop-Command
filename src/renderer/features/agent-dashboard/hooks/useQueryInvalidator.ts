/**
 * useQueryInvalidator — Declarative event-to-invalidation wiring.
 *
 * Replaces repetitive useIpcEvent + queryClient.invalidateQueries patterns
 * with a data-driven rules array. Each rule maps an IPC event channel to
 * one or more query keys that should be invalidated when the event fires.
 */

import { useQueryClient } from '@tanstack/react-query';

import type { EventChannel, EventPayload } from '@shared/ipc-contract';

import { useIpcEvent } from '@renderer/shared/hooks';

export interface InvalidationRule<T extends EventChannel = EventChannel> {
  channel: T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- readonly tuples from query key factories
  queryKeys: (payload: EventPayload<T>) => ReadonlyArray<readonly any[]>;
}

/** Helper to create a typed rule — infers the channel's payload type. */
export function rule<T extends EventChannel>(r: InvalidationRule<T>): InvalidationRule<T> {
  return r;
}

/**
 * Subscribe to IPC events and invalidate the specified query keys.
 *
 * @example
 * useQueryInvalidator([
 *   rule({ channel: EVENTS.SESSION.STARTED, queryKeys: (s) => [keys.sessions(), keys.session(s.id)] }),
 *   rule({ channel: EVENTS.TASK.UPDATED, queryKeys: (e) => [keys.tasks(e.featureSlug)] }),
 * ]);
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous rule array
export function useQueryInvalidator(rules: Array<InvalidationRule<any>>) {
  const queryClient = useQueryClient();

  for (const rule of rules) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- rules array is static per call-site
    useIpcEvent(rule.channel, (payload) => {
      for (const key of rule.queryKeys(payload)) {
        void queryClient.invalidateQueries({ queryKey: key as unknown[] });
      }
    });
  }
}
