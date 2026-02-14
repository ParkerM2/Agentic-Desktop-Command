/**
 * Global test setup for Vitest
 *
 * This file runs before all tests to set up the testing environment.
 * Configures mocks for Electron, file system, and node-pty.
 */

import { vi, beforeEach, afterEach } from 'vitest';

// ─── Module Mocks ──────────────────────────────────────────────

// Mock Electron module globally
vi.mock('electron', () => import('./mocks/electron'));

// Mock node-pty globally
vi.mock('@lydell/node-pty', () => import('./mocks/node-pty'));

// ─── Environment Setup ─────────────────────────────────────────

// Set test environment flags
process.env['NODE_ENV'] = 'test';
process.env['ELECTRON_IS_TEST'] = '1';

// Mock app paths for consistent test behavior
process.env['HOME'] = '/mock/home';
process.env['USERPROFILE'] = '/mock/home';

// ─── Test Lifecycle Hooks ──────────────────────────────────────

beforeEach(() => {
  // Clear all mock call history between tests
  vi.clearAllMocks();
});

afterEach(() => {
  // Reset timers if they were mocked
  vi.useRealTimers();
});

// ─── Global Test Utilities ─────────────────────────────────────

/**
 * Helper to wait for promises to resolve in tests.
 * Useful when testing async operations.
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Helper to wait for a specific number of milliseconds.
 * Use with vi.useFakeTimers() for testing time-based logic.
 */
export async function waitMs(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
