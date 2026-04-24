/**
 * Unit tests for hub WebSocket revocation wiring (Task 24).
 *
 * Covers:
 *  - Close code 4003 + JSON `{ reason }` body → emits HUB_EVENTS.REVOKED
 *    with the parsed reason + active hubId.
 *  - Close code 4003 + non-JSON body → emits with fallback reason
 *    'Access revoked'.
 *  - Close code 4003 + empty body → emits with fallback reason.
 *  - Close code !== 4003 → does NOT emit revoked; schedules reconnect
 *    via the injected scheduleConnect when isEnabledAndConnected().
 *  - After 4003 latches, subsequent close events are silent (no
 *    scheduleConnect).
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

import { HUB_EVENTS } from '@shared/ipc/hub/channels';
import type { HubConnection } from '@shared/types';

import {
  createHubWsClient,
  WS_CLOSE_REVOKED,
} from '@main/features/hub/hub-ws-client';
import type { IpcRouter } from '@main/ipc/router';

// ── MockWebSocket ────────────────────────────────────────────────────
//
// The SUT calls `new WebSocket(url)` and attaches listeners via
// addEventListener. We stub globalThis.WebSocket with a class that
// records listeners per event name so tests can fire `close` manually
// with an arbitrary code + reason.

type Listener = (event: unknown) => void;

class MockWebSocket {
  static readonly OPEN = 1;

  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = 0;
  private listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, cb: Listener): void {
    const arr = this.listeners.get(type) ?? [];
    arr.push(cb);
    this.listeners.set(type, arr);
  }

  send(_data: string): void {
    // no-op
  }

  close(): void {
    // no-op — tests drive close() manually via dispatchClose.
  }

  dispatchClose(code: number, reason: string): void {
    const cbs = this.listeners.get('close') ?? [];
    for (const cb of cbs) {
      cb({ code, reason });
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

interface Ctx {
  router: IpcRouter & { emit: Mock };
  scheduleConnect: Mock;
  isEnabledAndConnected: Mock;
  getActiveHubId: Mock;
  getConnection: () => HubConnection;
}

function makeCtx(overrides: Partial<Ctx> = {}): Ctx {
  const router = { emit: vi.fn(), handle: vi.fn() } as unknown as IpcRouter & {
    emit: Mock;
  };
  const scheduleConnect = vi.fn();
  const isEnabledAndConnected = vi.fn(() => true);
  const getActiveHubId = vi.fn((): string | null => 'hub-active');
  const getConnection = (): HubConnection => ({
    hubUrl: 'http://hub.test',
    apiKey: 'key',
    enabled: true,
    status: 'connected',
  });
  return {
    router,
    scheduleConnect,
    isEnabledAndConnected,
    getActiveHubId,
    getConnection,
    ...overrides,
  };
}

function startClient(ctx: Ctx): MockWebSocket {
  const client = createHubWsClient({
    router: ctx.router,
    getConnection: ctx.getConnection,
    isEnabledAndConnected: ctx.isEnabledAndConnected,
    messageListeners: [],
    scheduleConnect: ctx.scheduleConnect,
    getActiveHubId: ctx.getActiveHubId,
  });
  client.connect();
  const ws = MockWebSocket.instances.at(-1);
  if (!ws) throw new Error('MockWebSocket was not constructed');
  return ws;
}

// ── Setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────

describe('hub-ws-client revocation (4003)', () => {
  it('emits HUB_EVENTS.REVOKED with parsed reason on close 4003 + JSON body', () => {
    const ctx = makeCtx();
    const ws = startClient(ctx);

    ws.dispatchClose(WS_CLOSE_REVOKED, JSON.stringify({ reason: 'key rotated' }));

    expect(ctx.router.emit).toHaveBeenCalledWith(HUB_EVENTS.REVOKED, {
      hubId: 'hub-active',
      reason: 'key rotated',
    });
    expect(ctx.scheduleConnect).not.toHaveBeenCalled();
  });

  it('uses fallback reason on close 4003 + non-JSON body', () => {
    const ctx = makeCtx();
    const ws = startClient(ctx);

    ws.dispatchClose(WS_CLOSE_REVOKED, 'not-json-at-all');

    expect(ctx.router.emit).toHaveBeenCalledWith(HUB_EVENTS.REVOKED, {
      hubId: 'hub-active',
      reason: 'Access revoked',
    });
  });

  it('uses fallback reason on close 4003 + empty body', () => {
    const ctx = makeCtx();
    const ws = startClient(ctx);

    ws.dispatchClose(WS_CLOSE_REVOKED, '');

    expect(ctx.router.emit).toHaveBeenCalledWith(HUB_EVENTS.REVOKED, {
      hubId: 'hub-active',
      reason: 'Access revoked',
    });
  });

  it('uses fallback reason when JSON lacks a string reason field', () => {
    const ctx = makeCtx();
    const ws = startClient(ctx);

    ws.dispatchClose(WS_CLOSE_REVOKED, JSON.stringify({ other: 'field' }));

    expect(ctx.router.emit).toHaveBeenCalledWith(HUB_EVENTS.REVOKED, {
      hubId: 'hub-active',
      reason: 'Access revoked',
    });
  });

  it('does NOT emit revoked on non-4003 close; schedules reconnect', () => {
    const ctx = makeCtx();
    const ws = startClient(ctx);

    ws.dispatchClose(1006, '');

    const revokedCalls = ctx.router.emit.mock.calls.filter(
      ([channel]) => channel === HUB_EVENTS.REVOKED,
    );
    expect(revokedCalls).toHaveLength(0);

    // scheduleReconnect queues a timer that calls scheduleConnect after
    // BASE_RECONNECT_MS (30s). Advance fake timers past that.
    vi.advanceTimersByTime(30_000);
    expect(ctx.scheduleConnect).toHaveBeenCalledTimes(1);
  });

  it('does not emit revoked when there is no active hubId', () => {
    const ctx = makeCtx({
      getActiveHubId: vi.fn((): string | null => null),
    });
    const ws = startClient(ctx);

    ws.dispatchClose(WS_CLOSE_REVOKED, JSON.stringify({ reason: 'x' }));

    const revokedCalls = ctx.router.emit.mock.calls.filter(
      ([channel]) => channel === HUB_EVENTS.REVOKED,
    );
    expect(revokedCalls).toHaveLength(0);
    // Still must NOT schedule reconnect — revoked latch set.
    expect(ctx.scheduleConnect).not.toHaveBeenCalled();
  });

  it('suppresses reconnect on any subsequent close after 4003 latches', () => {
    const ctx = makeCtx();
    const ws = startClient(ctx);

    ws.dispatchClose(WS_CLOSE_REVOKED, JSON.stringify({ reason: 'done' }));
    // Simulate a follow-up close event (e.g. underlying socket teardown).
    ws.dispatchClose(1006, '');

    vi.advanceTimersByTime(60_000);
    expect(ctx.scheduleConnect).not.toHaveBeenCalled();
  });
});
