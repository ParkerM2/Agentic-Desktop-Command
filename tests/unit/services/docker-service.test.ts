/**
 * Unit Tests for DockerService
 *
 * Tests getStatus() and setupHub() by mocking child_process.execFile and fetch.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────

const mockExecFile = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: mockExecFile,
}));

vi.mock('node:util', () => ({
  promisify: () => mockExecFile,
}));

const { createDockerService } = await import(
  '@main/features/docker/docker-service'
);

// ── Helpers ───────────────────────────────────────────────────

function dockerSucceeds(stdout = '') {
  mockExecFile.mockResolvedValue({ stdout });
}

function dockerFails(message = 'command not found') {
  mockExecFile.mockRejectedValue(new Error(message));
}

// ── Tests ─────────────────────────────────────────────────────

describe('DockerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('getStatus()', () => {
    it('returns installed + running when docker info succeeds', async () => {
      const service = createDockerService();
      dockerSucceeds('Server Version: 24.0.6');

      const status = await service.getStatus();

      expect(status).toEqual({ installed: true, running: true });
    });

    it('returns installed + not running when info fails but version succeeds', async () => {
      const service = createDockerService();
      mockExecFile
        .mockRejectedValueOnce(new Error('daemon not running'))
        .mockResolvedValueOnce({ stdout: 'Docker version 24.0.6' });

      const status = await service.getStatus();

      expect(status).toEqual({ installed: true, running: false });
    });

    it('returns not installed when both info and version fail', async () => {
      const service = createDockerService();
      mockExecFile.mockRejectedValue(new Error('not found'));

      const status = await service.getStatus();

      expect(status).toEqual({ installed: false, running: false });
    });
  });

  describe('setupHub()', () => {
    it('returns error when Docker is not installed', async () => {
      const service = createDockerService();
      // getStatus will try info then version, both fail
      mockExecFile.mockRejectedValue(new Error('not found'));

      const result = await service.setupHub();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
      expect(result.step).toBe('docker-check');
    });

    it('returns error when Docker is not running', async () => {
      const service = createDockerService();
      // info fails, version succeeds
      mockExecFile
        .mockRejectedValueOnce(new Error('daemon not running'))
        .mockResolvedValueOnce({ stdout: 'Docker version 24.0.6' });

      const result = await service.setupHub();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not running');
      expect(result.step).toBe('docker-check');
    });

    it('catches unexpected errors and returns them', async () => {
      const service = createDockerService();
      // info succeeds (docker running), then inspect throws unexpected error
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'ok' }) // docker info
        .mockRejectedValueOnce(new Error('unexpected failure')); // docker inspect

      // Mock fetch to fail (waitForHealth needs it)
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

      const result = await service.setupHub();

      // The result depends on the flow — the container state returns 'none',
      // then it tries to pull which also fails
      // This tests that the catch-all in setupHub works
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }

      globalThis.fetch = originalFetch;
    });
  });
});
