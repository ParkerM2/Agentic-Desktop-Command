import { describe, expect, it, vi } from 'vitest';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';

import {
  forwardAgentManagerEvent,
  wireAgentDashboardBridge,
} from '@main/agent-host/agent-dashboard-bridge';
import type { AgentManagerEvent } from '@main/services/agent-manager/agent-manager-service';

describe('forwardAgentManagerEvent', () => {
  it('maps session.started to SESSION.STARTED with the session payload', () => {
    const emit = vi.fn();
    const session = { id: 's1', name: 'a' } as unknown as Record<string, unknown>;
    forwardAgentManagerEvent(
      { type: 'session.started', sessionId: 's1', data: session },
      emit,
    );
    expect(emit).toHaveBeenCalledWith(AGENT_DASHBOARD_EVENTS.SESSION.STARTED, session);
  });

  it('maps session.ended to SESSION.ENDED with status + exitCode', () => {
    const emit = vi.fn();
    const payload = { sessionId: 's1', status: 'completed' as const, exitCode: 0 };
    forwardAgentManagerEvent(
      { type: 'session.ended', sessionId: 's1', data: payload },
      emit,
    );
    expect(emit).toHaveBeenCalledWith(AGENT_DASHBOARD_EVENTS.SESSION.ENDED, payload);
  });

  it('maps status.changed to SESSION.STATUS-CHANGED with previous + new status', () => {
    const emit = vi.fn();
    const payload = {
      sessionId: 's1',
      previousStatus: 'idle' as const,
      newStatus: 'running' as const,
    };
    forwardAgentManagerEvent(
      { type: 'status.changed', sessionId: 's1', data: payload },
      emit,
    );
    expect(emit).toHaveBeenCalledWith(
      AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED'],
      payload,
    );
  });

  it('maps message.received to MESSAGE.RECEIVED with the chat message', () => {
    const emit = vi.fn();
    const message = { id: 'm1', agentId: 's1', role: 'assistant', content: [], timestamp: '' };
    forwardAgentManagerEvent(
      { type: 'message.received', sessionId: 's1', data: message },
      emit,
    );
    expect(emit).toHaveBeenCalledWith(AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED, message);
  });

  it('maps stream.event to STREAM.EVENT with sessionId + event payload', () => {
    const emit = vi.fn();
    const payload = { sessionId: 's1', event: { type: 'assistant' as const } };
    forwardAgentManagerEvent(
      { type: 'stream.event', sessionId: 's1', data: payload },
      emit,
    );
    expect(emit).toHaveBeenCalledWith(AGENT_DASHBOARD_EVENTS.STREAM.EVENT, payload);
  });

  it('ignores unknown event types without throwing', () => {
    const emit = vi.fn();
    forwardAgentManagerEvent(
      { type: 'made-up' as unknown as AgentManagerEvent['type'], sessionId: 's1', data: null },
      emit,
    );
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('wireAgentDashboardBridge', () => {
  it('subscribes to agentManager.onEvent and forwards each event to router.emit; returns the unsub', () => {
    let captured: ((e: AgentManagerEvent) => void) | undefined;
    const unsub = vi.fn();
    const agentManager = {
      onEvent: vi.fn((handler: (e: AgentManagerEvent) => void) => {
        captured = handler;
        return unsub;
      }),
    };
    const router = { emit: vi.fn() };

    const cleanup = wireAgentDashboardBridge(agentManager, router);
    expect(agentManager.onEvent).toHaveBeenCalledTimes(1);

    captured?.({
      type: 'message.received',
      sessionId: 's1',
      data: { id: 'm1', agentId: 's1', role: 'user', content: [], timestamp: '' },
    });
    expect(router.emit).toHaveBeenCalledWith(
      AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED,
      expect.objectContaining({ id: 'm1' }),
    );

    cleanup();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
