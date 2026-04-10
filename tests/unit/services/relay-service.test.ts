/**
 * Unit Tests for Relay Service
 *
 * Tests claim/release/force-reclaim via hubApiClient,
 * renewal timer lifecycle, incoming envelope dispatch,
 * and host-side session output piping.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RELAY_EVENTS } from '@shared/ipc/relay/channels';

import { createRelayService } from '@main/features/relay/relay-service';
import type { RelayService } from '@main/features/relay/relay-service';
import type { IpcRouter } from '@main/ipc/router';
import type { AgentManagerService } from '@main/services/agent-manager/agent-manager-service';
import type { HubApiClient } from '@main/features/hub/hub-api-client';
import type { HubConnectionManager } from '@main/features/hub/hub-connection';

// ── Mock Factories ──────────────────────────────────────────────

function createMockHubApiClient() {
  return {
    hubGet: vi.fn().mockResolvedValue({ ok: true, data: null }),
    hubPost: vi.fn().mockResolvedValue({ ok: true, data: { projectId: 'p1', claimedByDeviceId: 'dev-1', expiresAt: '2026-01-01T00:00:00Z' } }),
    hubPatch: vi.fn().mockResolvedValue({ ok: true, data: null }),
    hubPut: vi.fn().mockResolvedValue({ ok: true, data: null }),
    hubDelete: vi.fn().mockResolvedValue({ ok: true }),
    listTasks: vi.fn().mockResolvedValue({ ok: true, data: { tasks: [] } }),
    getTask: vi.fn().mockResolvedValue({ ok: true, data: null }),
    createTask: vi.fn().mockResolvedValue({ ok: true, data: null }),
    updateTask: vi.fn().mockResolvedValue({ ok: true, data: null }),
    deleteTask: vi.fn().mockResolvedValue({ ok: true }),
    pushProgress: vi.fn().mockResolvedValue({ ok: true, data: null }),
    updateTaskStatus: vi.fn().mockResolvedValue({ ok: true, data: null }),
    executeTask: vi.fn().mockResolvedValue({ ok: true, data: null }),
    cancelTask: vi.fn().mockResolvedValue({ ok: true, data: null }),
  } as unknown as HubApiClient;
}

function createMockHubConnectionManager() {
  const wsMessageHandlers: Array<(data: unknown) => void> = [];
  return {
    getConnection: vi.fn().mockReturnValue(null),
    configure: vi.fn(),
    setEnabled: vi.fn(),
    connect: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn(),
    getStatus: vi.fn().mockReturnValue('disconnected'),
    onWebSocketMessage: vi.fn((callback: (data: unknown) => void) => {
      wsMessageHandlers.push(callback);
    }),
    sendWebSocketMessage: vi.fn().mockReturnValue(true),
    dispose: vi.fn(),
    // test helper
    _wsMessageHandlers: wsMessageHandlers,
  } as unknown as HubConnectionManager & { _wsMessageHandlers: Array<(data: unknown) => void> };
}

function createMockRouter() {
  return {
    handle: vi.fn(),
    emit: vi.fn(),
  } as unknown as IpcRouter;
}

function createMockAgentManager() {
  const eventHandlers: Array<(event: { type: string; sessionId: string; data?: unknown }) => void> = [];
  return {
    spawnProjectOwner: vi.fn((_config: { projectPath: string; prompt: string; name: string }) => ({
      id: `local-session-${Date.now()}`,
      pid: 9999,
      status: 'active' as const,
      phase: 'executing' as const,
      spawnedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    })),
    stopSession: vi.fn().mockReturnValue(true),
    sendMessage: vi.fn().mockReturnValue(true),
    onEvent: vi.fn((handler: (event: { type: string; sessionId: string; data?: unknown }) => void) => {
      eventHandlers.push(handler);
      return () => {
        const idx = eventHandlers.indexOf(handler);
        if (idx !== -1) eventHandlers.splice(idx, 1);
      };
    }),
    listSessions: vi.fn().mockReturnValue([]),
    getSession: vi.fn(),
    getSessionProjectPath: vi.fn(),
    getMessages: vi.fn().mockReturnValue([]),
    dispose: vi.fn(),
    // test helper
    _triggerEvent(event: { type: string; sessionId: string; data?: unknown }) {
      for (const handler of [...eventHandlers]) {
        handler(event);
      }
    },
  } as unknown as AgentManagerService & {
    _triggerEvent: (event: { type: string; sessionId: string; data?: unknown }) => void;
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('RelayService', () => {
  let hubApiClient: ReturnType<typeof createMockHubApiClient>;
  let hubConnectionManager: ReturnType<typeof createMockHubConnectionManager>;
  let router: ReturnType<typeof createMockRouter>;
  let agentManager: ReturnType<typeof createMockAgentManager>;
  let service: RelayService;

  beforeEach(() => {
    vi.useFakeTimers();

    hubApiClient = createMockHubApiClient();
    hubConnectionManager = createMockHubConnectionManager();
    router = createMockRouter();
    agentManager = createMockAgentManager();

    service = createRelayService({
      hubApiClient: hubApiClient as unknown as HubApiClient,
      hubConnectionManager: hubConnectionManager as unknown as HubConnectionManager,
      router: router as unknown as IpcRouter,
      agentManagerService: agentManager as unknown as AgentManagerService,
    });

    // Set device ID so operations don't throw
    service.setDeviceId('test-device-1');
  });

  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── claimProject ───────────────────────────────────────────────

  describe('claimProject', () => {
    it('calls hubApiClient.hubPost with claim endpoint', async () => {
      await service.claimProject('project-1');

      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        '/api/projects/project-1/claim',
        { deviceId: 'test-device-1' },
      );
    });

    it('returns ClaimResult on success', async () => {
      const result = await service.claimProject('project-1');

      expect(result.success).toBe(true);
      expect(result.deviceId).toBe('test-device-1');
      expect(result.claimedAt).toBeDefined();
    });

    it('emits PROJECT.CLAIMED event', async () => {
      await service.claimProject('project-1');

      expect((router.emit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        RELAY_EVENTS.PROJECT.CLAIMED,
        expect.objectContaining({
          projectId: 'project-1',
          claimedByDeviceId: 'test-device-1',
        }),
      );
    });

    it('starts renewal timer on successful claim', async () => {
      await service.claimProject('project-1');

      // Advance past the 45s renewal interval
      await vi.advanceTimersByTimeAsync(45_000);

      // renewClaim should have been called via the timer
      // hubPost called twice: once for claim, once for renewal
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenLastCalledWith(
        '/api/projects/project-1/renew-claim',
        { deviceId: 'test-device-1' },
      );
    });

    it('throws when hubPost returns not ok', async () => {
      (hubApiClient.hubPost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        error: 'Forbidden',
      });

      await expect(service.claimProject('project-1')).rejects.toThrow('Forbidden');
    });

    it('throws when device ID not set', async () => {
      // Create a fresh service without setting device ID
      const freshService = createRelayService({
        hubApiClient: hubApiClient as unknown as HubApiClient,
        hubConnectionManager: createMockHubConnectionManager() as unknown as HubConnectionManager,
        router: router as unknown as IpcRouter,
        agentManagerService: agentManager as unknown as AgentManagerService,
      });

      await expect(freshService.claimProject('project-1')).rejects.toThrow(
        'Device not registered',
      );

      freshService.dispose();
    });
  });

  // ── releaseProject ─────────────────────────────────────────────

  describe('releaseProject', () => {
    it('calls hubApiClient.hubPost with release endpoint', async () => {
      await service.releaseProject('project-1');

      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        '/api/projects/project-1/release',
        { deviceId: 'test-device-1' },
      );
    });

    it('stops renewal timer on release', async () => {
      // First claim to start timer
      await service.claimProject('project-1');
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);

      // Release should stop the timer
      await service.releaseProject('project-1');

      // Advance well past renewal interval — no new calls
      await vi.advanceTimersByTimeAsync(90_000);

      // Only claim + release = 2 calls (no renewal)
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
    });

    it('emits PROJECT.UNCLAIMED event', async () => {
      await service.releaseProject('project-1');

      expect((router.emit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        RELAY_EVENTS.PROJECT.UNCLAIMED,
        expect.objectContaining({
          projectId: 'project-1',
        }),
      );
    });

    it('cleans up outgoing sessions for the released project', async () => {
      // Spawn an outgoing session
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);
      const sessionId = service.spawnRemoteSession('project-1', {
        agentRole: 'service-engineer',
        prompt: 'test',
        workDir: '/test',
        taskId: 'task-1',
      });

      // Verify session exists
      const before = service.listSessions('project-1');
      expect(before).toHaveLength(1);
      expect(before[0].sessionId).toBe(sessionId);

      // Release project
      await service.releaseProject('project-1');

      // Outgoing sessions should be cleaned up
      const after = service.listSessions('project-1');
      expect(after).toHaveLength(0);
    });

    it('throws when hubPost fails', async () => {
      (hubApiClient.hubPost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        error: 'Not found',
      });

      await expect(service.releaseProject('project-1')).rejects.toThrow('Not found');
    });
  });

  // ── forceReclaimProject ────────────────────────────────────────

  describe('forceReclaimProject', () => {
    it('calls hubApiClient.hubPost with force-reclaim endpoint', async () => {
      await service.forceReclaimProject('project-1');

      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        '/api/projects/project-1/force-reclaim',
        { deviceId: 'test-device-1' },
      );
    });

    it('starts renewal timer after reclaim', async () => {
      await service.forceReclaimProject('project-1');

      // Advance past the renewal interval
      await vi.advanceTimersByTimeAsync(45_000);

      // force-reclaim + renewal = 2 calls
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenLastCalledWith(
        '/api/projects/project-1/renew-claim',
        { deviceId: 'test-device-1' },
      );
    });

    it('throws when hubPost fails', async () => {
      (hubApiClient.hubPost as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        error: 'Conflict',
      });

      await expect(service.forceReclaimProject('project-1')).rejects.toThrow('Conflict');
    });
  });

  // ── renewClaim ─────────────────────────────────────────────────

  describe('renewClaim', () => {
    it('calls hubApiClient.hubPost with renew-claim endpoint', async () => {
      await service.renewClaim('project-1');

      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        '/api/projects/project-1/renew-claim',
        { deviceId: 'test-device-1' },
      );
    });
  });

  // ── Renewal Timer Lifecycle ────────────────────────────────────

  describe('renewal timer', () => {
    it('fires periodically at 45s intervals', async () => {
      await service.claimProject('project-1');

      // Advance 3 intervals
      await vi.advanceTimersByTimeAsync(45_000 * 3);

      // 1 claim + 3 renewals = 4 calls
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(4);
    });

    it('stops renewal when claim 404s', async () => {
      await service.claimProject('project-1');

      // Make renewal return 404
      (hubApiClient.hubPost as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: 'Not found',
        statusCode: 404,
      });

      // Trigger renewal
      await vi.advanceTimersByTimeAsync(45_000);

      // Reset mock to track further calls
      (hubApiClient.hubPost as ReturnType<typeof vi.fn>).mockClear();

      // Advance another interval — timer should have been stopped
      await vi.advanceTimersByTimeAsync(45_000);
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });
  });

  // ── spawnRemoteSession ─────────────────────────────────────────

  describe('spawnRemoteSession', () => {
    it('sends WS spawn message and returns sessionId', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      const sessionId = service.spawnRemoteSession('project-1', {
        agentRole: 'service-engineer',
        prompt: 'fix the bug',
        workDir: '/project',
        taskId: 'task-1',
      });

      expect(sessionId).toMatch(/^relay-/);
      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session.spawn',
          sessionId,
          projectId: 'project-1',
          data: {
            agentRole: 'service-engineer',
            prompt: 'fix the bug',
            workDir: '/project',
            taskId: 'task-1',
          },
        }),
      );
    });

    it('emits SESSION.SPAWNED event', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      const sessionId = service.spawnRemoteSession('project-1', {
        agentRole: 'researcher',
        prompt: 'research task',
        workDir: '/project',
        taskId: '',
      });

      expect((router.emit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        RELAY_EVENTS.SESSION.SPAWNED,
        expect.objectContaining({
          sessionId,
          projectId: 'project-1',
          agentRole: 'researcher',
        }),
      );
    });

    it('tracks session in listSessions', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      service.spawnRemoteSession('project-1', {
        agentRole: 'service-engineer',
        prompt: 'test',
        workDir: '/test',
        taskId: '',
      });

      const sessions = service.listSessions('project-1');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].source).toBe('relay');
      expect(sessions[0].status).toBe('active');
    });
  });

  // ── sendInput ──────────────────────────────────────────────────

  describe('sendInput', () => {
    it('sends WS input message for outgoing session', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      const sessionId = service.spawnRemoteSession('project-1', {
        agentRole: 'service-engineer',
        prompt: 'test',
        workDir: '/test',
        taskId: '',
      });

      service.sendInput(sessionId, 'hello world');

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session.input',
          sessionId,
          data: { data: 'hello world' },
        }),
      );
    });

    it('does not send for unknown session', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      service.sendInput('nonexistent-session', 'data');

      // Only no session.input call — the send for spawn won't happen either
      const inputCalls = mockSendFn.mock.calls.filter(
        (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'session.input',
      );
      expect(inputCalls).toHaveLength(0);
    });
  });

  // ── handleIncomingMessage ──────────────────────────────────────

  describe('handleIncomingMessage', () => {
    it('ignores non-object messages', () => {
      service.handleIncomingMessage(null);
      service.handleIncomingMessage('string');
      service.handleIncomingMessage(42);
      // No errors thrown
    });

    it('ignores messages without type', () => {
      service.handleIncomingMessage({ sessionId: 'test' });
      // No errors thrown
    });

    it('ignores non-session messages', () => {
      service.handleIncomingMessage({ type: 'heartbeat', data: {} });
      // No errors thrown
    });

    describe('session.output (outgoing)', () => {
      it('emits SESSION.OUTPUT event for tracked outgoing session', () => {
        const mockSendFn = vi.fn();
        service.setSendFn(mockSendFn);

        const sessionId = service.spawnRemoteSession('project-1', {
          agentRole: 'service-engineer',
          prompt: 'test',
          workDir: '/test',
          taskId: '',
        });

        service.handleIncomingMessage({
          type: 'session.output',
          sessionId,
          data: { data: 'some output', stream: 'stdout' },
        });

        expect((router.emit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
          RELAY_EVENTS.SESSION.OUTPUT,
          expect.objectContaining({
            sessionId,
            data: 'some output',
            stream: 'stdout',
          }),
        );
      });

      it('defaults stream to stdout', () => {
        const mockSendFn = vi.fn();
        service.setSendFn(mockSendFn);

        const sessionId = service.spawnRemoteSession('project-1', {
          agentRole: 'service-engineer',
          prompt: 'test',
          workDir: '/test',
          taskId: '',
        });

        service.handleIncomingMessage({
          type: 'session.output',
          sessionId,
          data: { data: 'output' },
        });

        expect((router.emit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
          RELAY_EVENTS.SESSION.OUTPUT,
          expect.objectContaining({
            stream: 'stdout',
          }),
        );
      });
    });

    describe('session.spawn (incoming)', () => {
      it('spawns local agent via agentManagerService', () => {
        service.handleIncomingMessage({
          type: 'session.spawn',
          sessionId: 'remote-session-1',
          projectId: 'project-1',
          sourceDeviceId: 'remote-device',
          data: {
            agentRole: 'service-engineer',
            prompt: 'fix the bug',
            workDir: '/project/path',
            taskId: 'task-1',
          },
        });

        expect((agentManager.spawnProjectOwner as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
          expect.objectContaining({
            projectPath: '/project/path',
            prompt: 'fix the bug',
            name: 'relay-remote-session-1',
          }),
        );
      });

      it('tracks incoming session in listSessions', () => {
        service.handleIncomingMessage({
          type: 'session.spawn',
          sessionId: 'remote-session-1',
          projectId: 'project-1',
          sourceDeviceId: 'remote-device',
          data: {
            agentRole: 'service-engineer',
            prompt: 'test',
            workDir: '/test',
            taskId: '',
          },
        });

        const sessions = service.listSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0].source).toBe('local');
        expect(sessions[0].sessionId).toBe('remote-session-1');
      });

      it('sends session.ended when spawn fails', () => {
        const mockSendFn = vi.fn();
        service.setSendFn(mockSendFn);

        (agentManager.spawnProjectOwner as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
          throw new Error('Spawn failed');
        });

        service.handleIncomingMessage({
          type: 'session.spawn',
          sessionId: 'fail-session',
          projectId: 'project-1',
          sourceDeviceId: 'remote-device',
          data: { agentRole: 'service-engineer', prompt: 'test', workDir: '/test', taskId: '' },
        });

        expect(mockSendFn).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'session.ended',
            sessionId: 'fail-session',
            data: expect.objectContaining({ exitCode: -1 }),
          }),
        );
      });
    });

    describe('session.ended (outgoing)', () => {
      it('emits SESSION.ENDED event and removes session', () => {
        const mockSendFn = vi.fn();
        service.setSendFn(mockSendFn);

        const sessionId = service.spawnRemoteSession('project-1', {
          agentRole: 'service-engineer',
          prompt: 'test',
          workDir: '/test',
          taskId: '',
        });

        service.handleIncomingMessage({
          type: 'session.ended',
          sessionId,
          data: { exitCode: 0, endedAt: '2026-01-01T00:00:00Z' },
        });

        expect((router.emit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
          RELAY_EVENTS.SESSION.ENDED,
          expect.objectContaining({
            sessionId,
            exitCode: 0,
          }),
        );

        // Session should be removed
        const sessions = service.listSessions();
        expect(sessions).toHaveLength(0);
      });
    });

    describe('session.input (incoming)', () => {
      it('forwards input to local session', () => {
        // First spawn an incoming session
        service.handleIncomingMessage({
          type: 'session.spawn',
          sessionId: 'remote-session-1',
          projectId: 'project-1',
          sourceDeviceId: 'remote-device',
          data: { agentRole: 'service-engineer', prompt: 'test', workDir: '/test', taskId: '' },
        });

        const localSessionId = (agentManager.spawnProjectOwner as ReturnType<typeof vi.fn>).mock.results[0].value.id;

        service.handleIncomingMessage({
          type: 'session.input',
          sessionId: 'remote-session-1',
          data: { data: 'user input' },
        });

        expect((agentManager.sendMessage as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
          localSessionId,
          'user input',
        );
      });
    });

    describe('session.kill (incoming)', () => {
      it('stops local session and cleans up', () => {
        // Spawn incoming session
        service.handleIncomingMessage({
          type: 'session.spawn',
          sessionId: 'remote-session-1',
          projectId: 'project-1',
          sourceDeviceId: 'remote-device',
          data: { agentRole: 'service-engineer', prompt: 'test', workDir: '/test', taskId: '' },
        });

        const localSessionId = (agentManager.spawnProjectOwner as ReturnType<typeof vi.fn>).mock.results[0].value.id;

        service.handleIncomingMessage({
          type: 'session.kill',
          sessionId: 'remote-session-1',
          data: {},
        });

        expect((agentManager.stopSession as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(localSessionId);

        // Session should be removed
        const sessions = service.listSessions();
        expect(sessions).toHaveLength(0);
      });
    });

    describe('claim.reclaimed', () => {
      it('stops renewal timer and emits CLAIM.RECLAIMED event', async () => {
        // First claim a project to start a timer
        await service.claimProject('project-1');

        // Simulate reclaim from another device
        service.handleIncomingMessage({
          type: 'claim.reclaimed',
          projectId: 'project-1',
          reclaimedByDeviceId: 'other-device',
          timestamp: '2026-01-01T00:00:00Z',
        });

        expect((router.emit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
          RELAY_EVENTS.CLAIM.RECLAIMED,
          expect.objectContaining({
            projectId: 'project-1',
            reclaimedByDeviceId: 'other-device',
          }),
        );

        // Renewal timer should have stopped — advance and verify no renewal calls
        (hubApiClient.hubPost as ReturnType<typeof vi.fn>).mockClear();
        await vi.advanceTimersByTimeAsync(90_000);
        expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
      });

      it('terminates outgoing sessions for reclaimed project', async () => {
        const mockSendFn = vi.fn();
        service.setSendFn(mockSendFn);

        // Create an outgoing session
        service.spawnRemoteSession('project-1', {
          agentRole: 'service-engineer',
          prompt: 'test',
          workDir: '/test',
          taskId: '',
        });

        expect(service.listSessions('project-1')).toHaveLength(1);

        // Simulate reclaim
        service.handleIncomingMessage({
          type: 'claim.reclaimed',
          projectId: 'project-1',
          reclaimedByDeviceId: 'other-device',
        });

        // Sessions should be cleaned up
        expect(service.listSessions('project-1')).toHaveLength(0);

        // SESSION.ENDED should have been emitted for the outgoing session
        expect((router.emit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
          RELAY_EVENTS.SESSION.ENDED,
          expect.objectContaining({
            exitCode: -1,
          }),
        );
      });
    });
  });

  // ── Host-side output piping ────────────────────────────────────

  describe('host-side session output piping', () => {
    it('pipes agent stream.event back as WS session.output', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      // Spawn incoming session
      service.handleIncomingMessage({
        type: 'session.spawn',
        sessionId: 'remote-session-1',
        projectId: 'project-1',
        sourceDeviceId: 'remote-device',
        data: { agentRole: 'service-engineer', prompt: 'test', workDir: '/test', taskId: '' },
      });

      const localSessionId = (agentManager.spawnProjectOwner as ReturnType<typeof vi.fn>).mock.results[0].value.id;

      // Simulate agent producing output
      agentManager._triggerEvent({
        type: 'stream.event',
        sessionId: localSessionId,
        data: { data: 'line 1\n', stream: 'stdout' },
      });

      // Should have sent WS message with session output
      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session.output',
          sessionId: 'remote-session-1',
          data: { data: 'line 1\n', stream: 'stdout' },
        }),
      );
    });

    it('pipes session.ended back as WS session.ended', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      // Spawn incoming session
      service.handleIncomingMessage({
        type: 'session.spawn',
        sessionId: 'remote-session-1',
        projectId: 'project-1',
        sourceDeviceId: 'remote-device',
        data: { agentRole: 'service-engineer', prompt: 'test', workDir: '/test', taskId: '' },
      });

      const localSessionId = (agentManager.spawnProjectOwner as ReturnType<typeof vi.fn>).mock.results[0].value.id;

      // Simulate agent ending
      agentManager._triggerEvent({
        type: 'session.ended',
        sessionId: localSessionId,
        data: { exitCode: 0 },
      });

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session.ended',
          sessionId: 'remote-session-1',
          data: expect.objectContaining({
            sessionId: 'remote-session-1',
            exitCode: 0,
          }),
        }),
      );

      // Session should be cleaned up
      expect(service.listSessions()).toHaveLength(0);
    });
  });

  // ── listSessions ───────────────────────────────────────────────

  describe('listSessions', () => {
    it('returns empty array when no sessions', () => {
      expect(service.listSessions()).toEqual([]);
    });

    it('filters by projectId', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      service.spawnRemoteSession('project-1', {
        agentRole: 'service-engineer',
        prompt: 'test',
        workDir: '/test',
        taskId: '',
      });

      service.spawnRemoteSession('project-2', {
        agentRole: 'researcher',
        prompt: 'test',
        workDir: '/test',
        taskId: '',
      });

      expect(service.listSessions('project-1')).toHaveLength(1);
      expect(service.listSessions('project-2')).toHaveLength(1);
      expect(service.listSessions()).toHaveLength(2);
    });
  });

  // ── getBuffer ──────────────────────────────────────────────────

  describe('getBuffer', () => {
    it('calls hubApiClient.hubGet with replay endpoint', async () => {
      (hubApiClient.hubGet as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        data: {
          data: {
            sessionId: 'session-1',
            messages: [{ seq: 1, message: { type: 'output' }, timestamp: '2026-01-01T00:00:00Z' }],
          },
        },
      });

      const result = await service.getBuffer('session-1');

      expect((hubApiClient.hubGet as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
        '/api/sessions/session-1/replay',
      );
      expect(result.sessionId).toBe('session-1');
      expect(result.messages).toHaveLength(1);
    });

    it('throws when hubGet fails', async () => {
      (hubApiClient.hubGet as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        error: 'Not found',
      });

      await expect(service.getBuffer('nonexistent')).rejects.toThrow('Not found');
    });
  });

  // ── setSendFn ──────────────────────────────────────────────────

  describe('setSendFn', () => {
    it('messages are dropped when no sendFn set', () => {
      // Don't set sendFn — spawn should not throw
      service.spawnRemoteSession('project-1', {
        agentRole: 'service-engineer',
        prompt: 'test',
        workDir: '/test',
        taskId: '',
      });
      // No error thrown, message silently dropped
    });
  });

  // ── dispose ────────────────────────────────────────────────────

  describe('dispose', () => {
    it('stops all renewal timers', async () => {
      await service.claimProject('project-1');
      await service.claimProject('project-2');

      service.dispose();

      // Advance past renewal — no calls should happen
      (hubApiClient.hubPost as ReturnType<typeof vi.fn>).mockClear();
      await vi.advanceTimersByTimeAsync(90_000);
      expect((hubApiClient.hubPost as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it('stops all incoming sessions', () => {
      // Spawn incoming session
      service.handleIncomingMessage({
        type: 'session.spawn',
        sessionId: 'remote-session-1',
        projectId: 'project-1',
        sourceDeviceId: 'remote-device',
        data: { agentRole: 'service-engineer', prompt: 'test', workDir: '/test', taskId: '' },
      });

      const localSessionId = (agentManager.spawnProjectOwner as ReturnType<typeof vi.fn>).mock.results[0].value.id;

      service.dispose();

      expect((agentManager.stopSession as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(localSessionId);
    });

    it('clears all sessions', () => {
      const mockSendFn = vi.fn();
      service.setSendFn(mockSendFn);

      service.spawnRemoteSession('project-1', {
        agentRole: 'service-engineer',
        prompt: 'test',
        workDir: '/test',
        taskId: '',
      });

      service.dispose();
      expect(service.listSessions()).toHaveLength(0);
    });
  });
});
