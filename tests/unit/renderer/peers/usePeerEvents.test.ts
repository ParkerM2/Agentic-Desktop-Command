/**
 * Unit tests for `useIncomingPin` (src/renderer/features/peers/api/usePeerEvents.ts).
 *
 * Verifies:
 *  - The hook subscribes via the shared `useIpcEvent` (not `window.api.on` directly).
 *  - The handler passed to `useIpcEvent` updates state with the payload.
 *  - `dismiss()` clears the stored PIN.
 *
 * The DOM-less test environment (vitest `node`) does not have jsdom, so we
 * exercise the hook by mocking React's `useState`/`useCallback` to capture
 * setters and invoke them directly. This keeps the test free of new
 * runtime dependencies while still validating wiring through the real module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useIncomingPin } from '../../../../src/renderer/features/peers/api/usePeerEvents';
import { PEERS_EVENTS } from '../../../../src/shared/ipc/peers';

import type { PinIssuedEvent } from '../../../../src/shared/ipc/peers';


type Handler = (payload: PinIssuedEvent) => void;

// ─── Module mocks (hoisted by vitest above the imports above) ─────────────

const ipcCalls: Array<{ channel: string; handler: Handler }> = [];

vi.mock('@renderer/shared/hooks/useIpcEvent', () => ({
  useIpcEvent: (channel: string, handler: Handler) => {
    ipcCalls.push({ channel, handler });
  },
}));

// Capture state setters so we can drive the hook without a DOM.
let stateValue: PinIssuedEvent | null = null;
const setStateMock = vi.fn((next: PinIssuedEvent | null) => {
  stateValue = next;
});

vi.mock('react', () => ({
  useState: (initial: PinIssuedEvent | null) => {
    stateValue = initial;
    return [stateValue, setStateMock];
  },
  useCallback: (fn: (...args: unknown[]) => unknown) => fn,
}));

// ─── Tests ────────────────────────────────────────────────────────────────

describe('useIncomingPin', () => {
  beforeEach(() => {
    ipcCalls.length = 0;
    stateValue = null;
    setStateMock.mockClear();
  });

  it('subscribes to PEERS_EVENTS.PIN.ISSUED via useIpcEvent', () => {
    useIncomingPin();

    expect(ipcCalls).toHaveLength(1);
    expect(ipcCalls[0].channel).toBe(PEERS_EVENTS.PIN.ISSUED);
    expect(typeof ipcCalls[0].handler).toBe('function');
  });

  it('updates state when the captured handler is invoked with a payload', () => {
    const result = useIncomingPin();

    expect(result.pin).toBeNull();

    const payload: PinIssuedEvent = {
      sessionId: 'session-1',
      pin: '123456',
      initiatorPeerId: 'peer-abc',
      initiatorDisplayName: 'Initiator Device',
      issuedAt: 1_700_000_000_000,
    };

    ipcCalls[0].handler(payload);

    expect(setStateMock).toHaveBeenCalledTimes(1);
    expect(setStateMock).toHaveBeenCalledWith(payload);
    expect(stateValue).toEqual(payload);
  });

  it('returns a dismiss callback that clears the PIN', () => {
    const result = useIncomingPin();

    // Seed a PIN as if the IPC handler had fired.
    const payload: PinIssuedEvent = {
      sessionId: 'session-2',
      pin: '654321',
      initiatorPeerId: 'peer-xyz',
      initiatorDisplayName: null,
      issuedAt: 1_700_000_001_000,
    };
    ipcCalls[0].handler(payload);
    setStateMock.mockClear();

    expect(typeof result.dismiss).toBe('function');
    result.dismiss();

    expect(setStateMock).toHaveBeenCalledTimes(1);
    expect(setStateMock).toHaveBeenCalledWith(null);
    expect(stateValue).toBeNull();
  });

  it('exposes a stable shape: { pin, dismiss }', () => {
    const result = useIncomingPin();
    expect(Object.keys(result).sort()).toEqual(['dismiss', 'pin']);
  });
});
