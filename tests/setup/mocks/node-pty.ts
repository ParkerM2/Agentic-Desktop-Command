/**
 * Mock PTY for testing
 *
 * Provides a mock implementation of @lydell/node-pty for testing
 * agent and terminal services without spawning real processes.
 */

import { EventEmitter } from 'node:events';

import { vi } from 'vitest';

import type { Mock } from 'vitest';

/**
 * Mock PTY process that simulates terminal behavior.
 * Extends EventEmitter to support the 'data' and 'exit' events.
 */
export class MockPty extends EventEmitter {
  /** Mock process ID */
  pid = 12345;

  /** Terminal columns */
  cols = 80;

  /** Terminal rows */
  rows = 24;

  /** Track if the process has been killed */
  private _killed = false;

  /** Store written data for assertions */
  private _writtenData: string[] = [];

  /** Mock write function - tracks calls */
  write: Mock<(data: string) => void> = vi.fn((data: string) => {
    this._writtenData.push(data);
  });

  /** Mock resize function */
  resize: Mock<(cols: number, rows: number) => void> = vi.fn(
    (cols: number, rows: number) => {
      this.cols = cols;
      this.rows = rows;
    },
  );

  /** Mock kill function - emits exit event */
  kill: Mock<(signal?: string) => void> = vi.fn((_signal?: string) => {
    if (!this._killed) {
      this._killed = true;
      // Emit exit event asynchronously to match real behavior
      process.nextTick(() => {
        this.emit('exit', 0, 0);
      });
    }
  });

  /** Mock onData handler registration */
  onData: Mock<(callback: (data: string) => void) => { dispose: () => void }> =
    vi.fn((callback: (data: string) => void) => {
      this.on('data', callback);
      return {
        dispose: () => {
          this.off('data', callback);
        },
      };
    });

  /** Mock onExit handler registration */
  onExit: Mock<
    (callback: (exit: { exitCode: number; signal?: number }) => void) => {
      dispose: () => void;
    }
  > = vi.fn(
    (callback: (exit: { exitCode: number; signal?: number }) => void) => {
      this.on('exit', (exitCode: number, signal?: number) => {
        callback({ exitCode, signal });
      });
      return {
        dispose: () => {
          this.removeAllListeners('exit');
        },
      };
    },
  );

  /**
   * Simulate output from the PTY process.
   * Use this in tests to trigger data handlers.
   *
   * @param data - The output data to simulate
   */
  simulateOutput(data: string): void {
    this.emit('data', data);
  }

  /**
   * Simulate the process exiting.
   *
   * @param exitCode - The exit code (default: 0)
   * @param signal - Optional signal number
   */
  simulateExit(exitCode = 0, signal?: number): void {
    if (!this._killed) {
      this._killed = true;
      this.emit('exit', exitCode, signal);
    }
  }

  /**
   * Get all data that has been written to the PTY.
   * Useful for assertions in tests.
   */
  getWrittenData(): string[] {
    return [...this._writtenData];
  }

  /**
   * Clear the written data history.
   */
  clearWrittenData(): void {
    this._writtenData = [];
  }

  /**
   * Check if the PTY has been killed.
   */
  isKilled(): boolean {
    return this._killed;
  }

  /**
   * Reset the mock to initial state.
   */
  reset(): void {
    this._killed = false;
    this._writtenData = [];
    this.cols = 80;
    this.rows = 24;
    this.removeAllListeners();
    this.write.mockClear();
    this.resize.mockClear();
    this.kill.mockClear();
    this.onData.mockClear();
    this.onExit.mockClear();
  }
}

/**
 * Spawn options for the mock PTY
 */
interface SpawnOptions {
  name?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Mock spawn function that creates a MockPty instance.
 * Tracks all spawned PTY instances for assertions.
 */
export const spawn = vi.fn(
  (
    file: string,
    args: string[] = [],
    options: SpawnOptions = {},
  ): MockPty => {
    const pty = new MockPty();

    if (options.cols !== undefined) {
      pty.cols = options.cols;
    }
    if (options.rows !== undefined) {
      pty.rows = options.rows;
    }

    // Store spawn arguments on the instance for test assertions
    Object.assign(pty, {
      _spawnFile: file,
      _spawnArgs: args,
      _spawnOptions: options,
    });

    return pty;
  },
);

/**
 * Helper to get the last spawned PTY instance.
 * Useful for assertions in tests.
 */
export function getLastSpawnedPty(): MockPty | undefined {
  const calls = spawn.mock.results;
  if (calls.length === 0) {
    return;
  }
  const lastCall = calls[calls.length - 1];
  if (lastCall?.type === 'return') {
    return lastCall.value as MockPty;
  }
  return;
}

/**
 * Reset all mock state.
 * Call this in afterEach to clean up between tests.
 */
export function resetPtyMocks(): void {
  spawn.mockClear();
}

/**
 * Default export matching node-pty module structure.
 */
export default {
  spawn,
};
