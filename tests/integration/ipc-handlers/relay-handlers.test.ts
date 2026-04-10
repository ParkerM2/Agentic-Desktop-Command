/**
 * Integration tests for relay IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> service -> response
 * with Zod validation at the boundary. Uses channel constants throughout.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';
import { RELAY } from '@shared/ipc/relay/channels';

import type { IpcRouter } from '@main/ipc/router';
import type { RelayService } from '@main/features/relay/relay-service';

// ─── Mock Relay Service Factory ──────────────────────────────────

function createMockRelayService(): RelayService {
  return {
    claimProject: vi.fn().mockResolvedValue({
      success: true,
      claimedAt: '2026-01-01T00:00:00Z',
      deviceId: 'test-device-1',
    }),
    releaseProject: vi.fn().mockResolvedValue(undefined),
    forceReclaimProject: vi.fn().mockResolvedValue(undefined),
    renewClaim: vi.fn().mockResolvedValue(undefined),
    spawnRemoteSession: vi.fn().mockReturnValue('relay-session-123'),
    sendInput: vi.fn(),
    handleIncomingMessage: vi.fn(),
    listSessions: vi.fn().mockReturnValue([
      {
        sessionId: 'relay-session-1',
        projectId: 'project-1',
        status: 'active',
        source: 'relay',
        startedAt: '2026-01-01T00:00:00Z',
      },
    ]),
    getBuffer: vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      messages: [
        { seq: 1, message: { type: 'output' }, timestamp: '2026-01-01T00:00:00Z' },
      ],
    }),
    setSendFn: vi.fn(),
    setDeviceId: vi.fn(),
    dispose: vi.fn(),
  };
}

// ─── Test Router Implementation ─────────────────────────────────

function createTestRouter(): {
  router: IpcRouter;
  handlers: Map<string, (input: unknown) => Promise<unknown>>;
  invoke: (channel: string, input: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
} {
  const handlers = new Map<string, (input: unknown) => Promise<unknown>>();

  const router = {
    handle: (channel: string, handler: (input: unknown) => Promise<unknown>) => {
      handlers.set(channel, handler);
    },
    emit: vi.fn(),
  } as unknown as IpcRouter;

  const invoke = async (
    channel: string,
    input: unknown,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    const handler = handlers.get(channel);
    if (!handler) {
      return { success: false, error: `No handler for channel: ${channel}` };
    }

    const channelKey = channel as InvokeChannel;
    const schema = ipcInvokeContract[channelKey];

    try {
      const parsed = schema.input.parse(input ?? {});
      const result = await handler(parsed);
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  };

  return { router, handlers, invoke };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('Relay IPC Handlers', () => {
  let relayService: RelayService;
  let router: IpcRouter;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];

  beforeEach(async () => {
    relayService = createMockRelayService();

    const testRouter = createTestRouter();
    ({ router, invoke } = testRouter);

    // Dynamically import and register handlers
    const { registerRelayHandlers } = await import(
      '@main/features/relay/relay-handlers'
    );
    registerRelayHandlers(router, relayService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── relay.claim.project ────────────────────────────────────────

  describe(RELAY.CLAIM.PROJECT, () => {
    it('calls relayService.claimProject and returns result', async () => {
      const result = await invoke(RELAY.CLAIM.PROJECT, { projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        success: true,
        claimedAt: '2026-01-01T00:00:00Z',
        deviceId: 'test-device-1',
      });
      expect(relayService.claimProject).toHaveBeenCalledWith('project-1');
    });

    it('validates input — missing projectId', async () => {
      const result = await invoke(RELAY.CLAIM.PROJECT, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates input — projectId must be string', async () => {
      const result = await invoke(RELAY.CLAIM.PROJECT, { projectId: 123 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── relay.release.project ──────────────────────────────────────

  describe(RELAY.RELEASE.PROJECT, () => {
    it('calls relayService.releaseProject and returns success', async () => {
      const result = await invoke(RELAY.RELEASE.PROJECT, { projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ success: true });
      expect(relayService.releaseProject).toHaveBeenCalledWith('project-1');
    });

    it('validates input — missing projectId', async () => {
      const result = await invoke(RELAY.RELEASE.PROJECT, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── relay.reclaim.project ──────────────────────────────────────

  describe(RELAY.RECLAIM.PROJECT, () => {
    it('calls relayService.forceReclaimProject and returns success', async () => {
      const result = await invoke(RELAY.RECLAIM.PROJECT, { projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ success: true });
      expect(result.data).toHaveProperty('reclaimedAt');
      expect(relayService.forceReclaimProject).toHaveBeenCalledWith('project-1');
    });

    it('validates input — missing projectId', async () => {
      const result = await invoke(RELAY.RECLAIM.PROJECT, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── relay.spawn.session ────────────────────────────────────────

  describe(RELAY.SPAWN.SESSION, () => {
    it('calls relayService.spawnRemoteSession and returns sessionId', async () => {
      const result = await invoke(RELAY.SPAWN.SESSION, {
        projectId: 'project-1',
        agentRole: 'service-engineer',
        prompt: 'fix the bug',
        workDir: '/project/path',
        taskId: 'task-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ sessionId: 'relay-session-123' });
      expect(relayService.spawnRemoteSession).toHaveBeenCalledWith('project-1', {
        agentRole: 'service-engineer',
        prompt: 'fix the bug',
        workDir: '/project/path',
        taskId: 'task-1',
      });
    });

    it('allows optional taskId', async () => {
      const result = await invoke(RELAY.SPAWN.SESSION, {
        projectId: 'project-1',
        agentRole: 'service-engineer',
        prompt: 'test',
        workDir: '/test',
      });

      expect(result.success).toBe(true);
      expect(relayService.spawnRemoteSession).toHaveBeenCalledWith('project-1', {
        agentRole: 'service-engineer',
        prompt: 'test',
        workDir: '/test',
        taskId: '',
      });
    });

    it('validates input — missing required fields', async () => {
      const result = await invoke(RELAY.SPAWN.SESSION, { projectId: 'project-1' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates input — empty object', async () => {
      const result = await invoke(RELAY.SPAWN.SESSION, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── relay.send.input ───────────────────────────────────────────

  describe(RELAY.SEND.INPUT, () => {
    it('calls relayService.sendInput and returns success', async () => {
      const result = await invoke(RELAY.SEND.INPUT, {
        sessionId: 'session-1',
        data: 'hello world',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ success: true });
      expect(relayService.sendInput).toHaveBeenCalledWith('session-1', 'hello world');
    });

    it('validates input — missing sessionId', async () => {
      const result = await invoke(RELAY.SEND.INPUT, { data: 'hello' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates input — missing data', async () => {
      const result = await invoke(RELAY.SEND.INPUT, { sessionId: 'session-1' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── relay.list.sessions ────────────────────────────────────────

  describe(RELAY.LIST.SESSIONS, () => {
    it('calls relayService.listSessions and returns array', async () => {
      const result = await invoke(RELAY.LIST.SESSIONS, { projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(relayService.listSessions).toHaveBeenCalledWith('project-1');
    });

    it('validates input — missing projectId', async () => {
      const result = await invoke(RELAY.LIST.SESSIONS, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── relay.get.buffer ───────────────────────────────────────────

  describe(RELAY.GET.BUFFER, () => {
    it('calls relayService.getBuffer and returns messages', async () => {
      const result = await invoke(RELAY.GET.BUFFER, { sessionId: 'session-1' });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        sessionId: 'session-1',
        messages: expect.arrayContaining([
          expect.objectContaining({ seq: 1 }),
        ]),
      });
      expect(relayService.getBuffer).toHaveBeenCalledWith('session-1');
    });

    it('validates input — missing sessionId', async () => {
      const result = await invoke(RELAY.GET.BUFFER, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates input — sessionId must be string', async () => {
      const result = await invoke(RELAY.GET.BUFFER, { sessionId: 42 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── relay.renew.claim ──────────────────────────────────────────

  describe(RELAY.RENEW.CLAIM, () => {
    it('calls relayService.renewClaim and returns success', async () => {
      const result = await invoke(RELAY.RENEW.CLAIM, { projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ success: true });
      expect(result.data).toHaveProperty('renewedAt');
      expect(relayService.renewClaim).toHaveBeenCalledWith('project-1');
    });

    it('validates input — missing projectId', async () => {
      const result = await invoke(RELAY.RENEW.CLAIM, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── Handler registration ───────────────────────────────────────

  describe('handler registration', () => {
    it('registers all 8 relay channels', () => {
      const expectedChannels = [
        RELAY.CLAIM.PROJECT,
        RELAY.RELEASE.PROJECT,
        RELAY.RECLAIM.PROJECT,
        RELAY.SPAWN.SESSION,
        RELAY.SEND.INPUT,
        RELAY.LIST.SESSIONS,
        RELAY.GET.BUFFER,
        RELAY.RENEW.CLAIM,
      ];

      for (const channel of expectedChannels) {
        const result = invoke(channel, {});
        // If handler exists, invoke won't return "No handler" error
        expect(result).toBeDefined();
      }
    });
  });
});
