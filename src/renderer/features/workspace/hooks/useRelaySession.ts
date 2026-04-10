/**
 * useRelaySession — Subscribe to relay session lifecycle and output events.
 *
 * Listens to RELAY_EVENTS.SESSION.OUTPUT, SPAWNED, and ENDED and normalizes
 * them into a local buffer that mirrors local agent session events. Also
 * handles RELAY_EVENTS.CLAIM.RECLAIMED to trigger a toast and mark the
 * relay session as terminated.
 */

import { useCallback, useRef, useState } from 'react';

import { RELAY_EVENTS } from '@shared/ipc/relay/channels';

import { useIpcEvent } from '@renderer/shared/hooks';
import { useToastStore } from '@renderer/shared/stores';

// ── Types ──────────────────────────────────────────────────────

export interface RelayOutputLine {
  readonly seq: number;
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
  readonly timestamp: string;
}

export interface RelaySessionState {
  readonly sessionId: string;
  readonly projectId: string;
  readonly agentRole: string;
  readonly status: 'active' | 'ended' | 'reclaimed';
  readonly output: readonly RelayOutputLine[];
  readonly exitCode: number | null;
  readonly startedAt: string;
  readonly endedAt: string | null;
}

// ── Hook ───────────────────────────────────────────────────────

/**
 * Subscribe to relay session events for a specific session.
 * Returns the current relay session state with accumulated output.
 */
export function useRelaySession(sessionId: string | null): RelaySessionState | null {
  const [state, setState] = useState<RelaySessionState | null>(null);
  const seqRef = useRef(0);
  const addToast = useToastStore((s) => s.addToast);

  // ── Session spawned ──────────────────────────────────────────

  useIpcEvent(
    RELAY_EVENTS.SESSION.SPAWNED,
    useCallback(
      (payload: { sessionId: string; projectId: string; agentRole: string }) => {
        if (sessionId !== null && payload.sessionId !== sessionId) return;

        seqRef.current = 0;
        setState({
          sessionId: payload.sessionId,
          projectId: payload.projectId,
          agentRole: payload.agentRole,
          status: 'active',
          output: [],
          exitCode: null,
          startedAt: new Date().toISOString(),
          endedAt: null,
        });
      },
      [sessionId],
    ),
  );

  // ── Session output ───────────────────────────────────────────

  useIpcEvent(
    RELAY_EVENTS.SESSION.OUTPUT,
    useCallback(
      (payload: { sessionId: string; data: string; stream: 'stdout' | 'stderr' }) => {
        if (payload.sessionId !== sessionId) return;

        seqRef.current += 1;
        const line: RelayOutputLine = {
          seq: seqRef.current,
          data: payload.data,
          stream: payload.stream,
          timestamp: new Date().toISOString(),
        };

        setState((prev) => {
          if (prev?.sessionId !== sessionId) return prev;
          return { ...prev, output: [...prev.output, line] };
        });
      },
      [sessionId],
    ),
  );

  // ── Session ended ────────────────────────────────────────────

  useIpcEvent(
    RELAY_EVENTS.SESSION.ENDED,
    useCallback(
      (payload: { sessionId: string; exitCode: number; endedAt: string }) => {
        if (payload.sessionId !== sessionId) return;

        setState((prev) => {
          if (prev?.sessionId !== sessionId) return prev;
          return {
            ...prev,
            status: 'ended',
            exitCode: payload.exitCode,
            endedAt: payload.endedAt,
          };
        });
      },
      [sessionId],
    ),
  );

  // ── Claim reclaimed (project takeover by another device) ─────

  useIpcEvent(
    RELAY_EVENTS.CLAIM.RECLAIMED,
    useCallback(
      (payload: { projectId: string; reclaimedByDeviceId: string; reclaimedAt: string }) => {
        // If we're tracking a relay session for this project, mark it reclaimed
        setState((prev) => {
          if (!prev) return prev;
          if (prev.projectId !== payload.projectId) return prev;

          addToast(
            `Project claim was reclaimed by device ${payload.reclaimedByDeviceId}. Relay session terminated.`,
            'warning',
          );

          return {
            ...prev,
            status: 'reclaimed',
            endedAt: payload.reclaimedAt,
          };
        });
      },
      [addToast],
    ),
  );

  return state;
}
