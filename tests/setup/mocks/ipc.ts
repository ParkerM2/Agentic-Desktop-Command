/**
 * Mock IPC for renderer process testing
 *
 * Provides mock implementations of window.api.invoke() and window.api.on()
 * for testing React components and hooks that use IPC.
 */

import { vi } from 'vitest';

import type { Mock } from 'vitest';
import type {
  EventChannel,
  EventPayload,
  InvokeChannel,
  InvokeInput,
  InvokeOutput,
} from '@shared/ipc-contract';

/**
 * Result type for IPC invoke calls
 */
interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Type-safe mock response configuration
 */
type MockResponseConfig = Partial<{
  [K in InvokeChannel]: IpcResult<InvokeOutput<K>> | ((input: InvokeInput<K>) => IpcResult<InvokeOutput<K>>);
}>;

/**
 * Event listener registration
 */
interface EventListener<T extends EventChannel = EventChannel> {
  channel: T;
  handler: (payload: EventPayload<T>) => void;
}

/**
 * Creates a mock IPC bridge for renderer process testing.
 * Provides configurable mock responses and event simulation.
 */
export function createMockIpc() {
  const mockResponses: MockResponseConfig = {};
  const eventListeners: EventListener[] = [];

  /**
   * Mock invoke function that returns configured responses.
   */
  const invoke: Mock<
    <T extends InvokeChannel>(
      channel: T,
      input: InvokeInput<T>,
    ) => Promise<IpcResult<InvokeOutput<T>>>
  > = vi.fn(async <T extends InvokeChannel>(
    channel: T,
    input: InvokeInput<T>,
  ): Promise<IpcResult<InvokeOutput<T>>> => {
    const response = mockResponses[channel];

    if (response === undefined) {
      return {
        success: false,
        error: `No mock response configured for channel: ${channel}`,
      };
    }

    if (typeof response === 'function') {
      return response(input as never) as IpcResult<InvokeOutput<T>>;
    }

    return response as IpcResult<InvokeOutput<T>>;
  });

  /**
   * Mock on function for event subscriptions.
   * Returns an unsubscribe function.
   */
  const on: Mock<
    <T extends EventChannel>(
      channel: T,
      handler: (payload: EventPayload<T>) => void,
    ) => () => void
  > = vi.fn(<T extends EventChannel>(
    channel: T,
    handler: (payload: EventPayload<T>) => void,
  ) => {
    const listener: EventListener<T> = { channel, handler };
    eventListeners.push(listener as EventListener);

    // Return unsubscribe function
    return () => {
      const index = eventListeners.indexOf(listener as EventListener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    };
  });

  /**
   * The mock window.api object
   */
  const api = {
    invoke,
    on,
  };

  return {
    api,

    /**
     * Set a mock response for a specific IPC channel.
     *
     * @example
     * ```ts
     * mockIpc.setResponse('projects.list', {
     *   success: true,
     *   data: [{ id: '1', name: 'Test Project', ... }],
     * });
     * ```
     */
    setResponse<T extends InvokeChannel>(
      channel: T,
      response: IpcResult<InvokeOutput<T>> | ((input: InvokeInput<T>) => IpcResult<InvokeOutput<T>>),
    ): void {
      mockResponses[channel] = response as MockResponseConfig[T];
    },

    /**
     * Set multiple mock responses at once.
     */
    setResponses(responses: MockResponseConfig): void {
      Object.assign(mockResponses, responses);
    },

    /**
     * Set a successful response with data.
     */
    setSuccessResponse<T extends InvokeChannel>(
      channel: T,
      data: InvokeOutput<T>,
    ): void {
      mockResponses[channel] = { success: true, data } as MockResponseConfig[T];
    },

    /**
     * Set an error response.
     */
    setErrorResponse<T extends InvokeChannel>(
      channel: T,
      error: string,
    ): void {
      mockResponses[channel] = { success: false, error } as MockResponseConfig[T];
    },

    /**
     * Simulate an IPC event from the main process.
     *
     * @example
     * ```ts
     * mockIpc.emitEvent('event:task.statusChanged', {
     *   taskId: '123',
     *   status: 'completed',
     *   projectId: 'proj-1',
     * });
     * ```
     */
    emitEvent<T extends EventChannel>(
      channel: T,
      payload: EventPayload<T>,
    ): void {
      for (const listener of eventListeners) {
        if (listener.channel === channel) {
          (listener.handler as (payload: EventPayload<T>) => void)(payload);
        }
      }
    },

    /**
     * Get all registered event listeners.
     */
    getEventListeners(): EventListener[] {
      return [...eventListeners];
    },

    /**
     * Get listeners for a specific channel.
     */
    getListenersForChannel<T extends EventChannel>(
      channel: T,
    ): Array<(payload: EventPayload<T>) => void> {
      return eventListeners
        .filter((l) => l.channel === channel)
        .map((l) => l.handler as (payload: EventPayload<T>) => void);
    },

    /**
     * Clear all mock responses and event listeners.
     */
    reset(): void {
      for (const key of Object.keys(mockResponses)) {
        delete mockResponses[key as InvokeChannel];
      }
      eventListeners.length = 0;
      invoke.mockClear();
      on.mockClear();
    },

    /**
     * Get all invoke calls for a specific channel.
     */
    getInvokeCalls<T extends InvokeChannel>(
      channel: T,
    ): Array<InvokeInput<T>> {
      return invoke.mock.calls
        .filter(([ch]) => ch === channel)
        .map(([, input]) => input as InvokeInput<T>);
    },

    /**
     * Assert that invoke was called with specific arguments.
     */
    assertInvokeCalled<T extends InvokeChannel>(
      channel: T,
      input?: Partial<InvokeInput<T>>,
    ): void {
      const calls = invoke.mock.calls.filter(([ch]) => ch === channel);

      if (calls.length === 0) {
        throw new Error(`Expected invoke to be called with channel '${channel}', but it was not called`);
      }

      if (input !== undefined) {
        const matchingCall = calls.find(([, callInput]) => {
          for (const [key, value] of Object.entries(input)) {
            if ((callInput as Record<string, unknown>)[key] !== value) {
              return false;
            }
          }
          return true;
        });

        if (matchingCall === undefined) {
          throw new Error(
            `Expected invoke to be called with channel '${channel}' and input ${JSON.stringify(input)}, ` +
            `but was called with: ${JSON.stringify(calls.map(([, i]) => i))}`,
          );
        }
      }
    },
  };
}

/**
 * Default mock IPC instance.
 * Can be used directly or replaced in individual tests.
 */
export const mockIpc = createMockIpc();

/**
 * Setup function to install the mock IPC on window.api.
 * Call this in test setup.
 */
export function setupIpcMock(): ReturnType<typeof createMockIpc> {
  const mock = createMockIpc();

  // Install on global window object
  Object.defineProperty(globalThis, 'window', {
    value: {
      ...globalThis.window,
      api: mock.api,
    },
    writable: true,
    configurable: true,
  });

  return mock;
}

/**
 * Helper type for creating typed mock responses
 */
export type MockIpcResponses = MockResponseConfig;

export default mockIpc;
