/**
 * Integration tests for auth IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> HubAuthService -> response
 * with Zod validation at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';

import type { IpcRouter } from '@main/ipc/router';
import type { HubAuthResult, HubAuthService } from '@main/services/hub/hub-auth-service';
import type { AuthRefreshResponse, AuthResponse, User } from '@shared/types/hub-protocol';

// ─── Mock Factory ──────────────────────────────────────────────

function createMockHubUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-02-19T12:00:00.000Z',
    ...overrides,
  };
}

function createMockAuthResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  // expiresAt is 15 minutes from now
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  return {
    user: createMockHubUser(),
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresAt,
    ...overrides,
  };
}

function createMockHubAuthService(): HubAuthService {
  return {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
    getAccessToken: vi.fn(),
    isAuthenticated: vi.fn(),
  };
}

// ─── Test Router Implementation ────────────────────────────────

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

// ─── Tests ─────────────────────────────────────────────────────

describe('Auth IPC Handlers', () => {
  let hubAuthService: HubAuthService;
  let router: IpcRouter;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];

  beforeEach(async () => {
    hubAuthService = createMockHubAuthService();

    const testRouter = createTestRouter();
    ({ router, invoke } = testRouter);

    const { registerAuthHandlers } = await import('@main/ipc/handlers/auth-handlers');
    registerAuthHandlers(router, { hubAuthService });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── auth.login ────────────────────────────────────────────────

  describe('auth.login', () => {
    it('returns user and tokens on successful login', async () => {
      const authResponse = createMockAuthResponse();
      vi.mocked(hubAuthService.login).mockResolvedValue({
        ok: true,
        data: authResponse,
      });

      const result = await invoke('auth.login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      const data = result.data as { user: Record<string, unknown>; tokens: Record<string, unknown> };
      expect(data.user.id).toBe('user-1');
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.displayName).toBe('Test User');
      expect(data.tokens.accessToken).toBe('access-token-123');
      expect(data.tokens.refreshToken).toBe('refresh-token-456');
      expect(typeof data.tokens.expiresIn).toBe('number');
      expect(hubAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('transforms avatarUrl null correctly', async () => {
      const authResponse = createMockAuthResponse({
        user: createMockHubUser({ avatarUrl: undefined }),
      });
      vi.mocked(hubAuthService.login).mockResolvedValue({
        ok: true,
        data: authResponse,
      });

      const result = await invoke('auth.login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      const data = result.data as { user: Record<string, unknown> };
      expect(data.user.avatarUrl).toBeNull();
    });

    it('throws on login failure', async () => {
      vi.mocked(hubAuthService.login).mockResolvedValue({
        ok: false,
        error: 'Invalid credentials',
      } as HubAuthResult<AuthResponse>);

      const result = await invoke('auth.login', {
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('uses default error message when none provided', async () => {
      vi.mocked(hubAuthService.login).mockResolvedValue({
        ok: false,
      } as HubAuthResult<AuthResponse>);

      const result = await invoke('auth.login', {
        email: 'test@example.com',
        password: 'password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Login failed');
    });

    it('validates input with Zod - missing email', async () => {
      const result = await invoke('auth.login', {
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('email');
    });

    it('validates input with Zod - missing password', async () => {
      const result = await invoke('auth.login', {
        email: 'test@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('password');
    });
  });

  // ─── auth.register ────────────────────────────────────────────

  describe('auth.register', () => {
    it('returns user and tokens on successful registration', async () => {
      const authResponse = createMockAuthResponse();
      vi.mocked(hubAuthService.register).mockResolvedValue({
        ok: true,
        data: authResponse,
      });

      const result = await invoke('auth.register', {
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });

      expect(result.success).toBe(true);
      const data = result.data as { user: Record<string, unknown>; tokens: Record<string, unknown> };
      expect(data.user.id).toBe('user-1');
      expect(data.tokens.accessToken).toBe('access-token-123');
      expect(hubAuthService.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });
    });

    it('throws on registration failure', async () => {
      vi.mocked(hubAuthService.register).mockResolvedValue({
        ok: false,
        error: 'Email already in use',
      } as HubAuthResult<AuthResponse>);

      const result = await invoke('auth.register', {
        email: 'existing@example.com',
        password: 'password123',
        displayName: 'Existing User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already in use');
    });

    it('uses default error message when none provided', async () => {
      vi.mocked(hubAuthService.register).mockResolvedValue({
        ok: false,
      } as HubAuthResult<AuthResponse>);

      const result = await invoke('auth.register', {
        email: 'test@example.com',
        password: 'password',
        displayName: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration failed');
    });

    it('validates input with Zod - missing email', async () => {
      const result = await invoke('auth.register', {
        password: 'password123',
        displayName: 'New User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('email');
    });

    it('validates input with Zod - missing password', async () => {
      const result = await invoke('auth.register', {
        email: 'new@example.com',
        displayName: 'New User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('password');
    });

    it('validates input with Zod - missing displayName', async () => {
      const result = await invoke('auth.register', {
        email: 'new@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('displayName');
    });
  });

  // ─── auth.me ──────────────────────────────────────────────────

  describe('auth.me', () => {
    it('returns current user', async () => {
      const user = createMockHubUser();
      vi.mocked(hubAuthService.getCurrentUser).mockResolvedValue({
        ok: true,
        data: user,
      });

      const result = await invoke('auth.me', {});

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.id).toBe('user-1');
      expect(data.email).toBe('test@example.com');
      expect(data.displayName).toBe('Test User');
    });

    it('transforms undefined avatarUrl to null', async () => {
      const user = createMockHubUser({ avatarUrl: undefined });
      vi.mocked(hubAuthService.getCurrentUser).mockResolvedValue({
        ok: true,
        data: user,
      });

      const result = await invoke('auth.me', {});

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.avatarUrl).toBeNull();
    });

    it('transforms undefined lastLoginAt to null', async () => {
      const user = createMockHubUser({ lastLoginAt: undefined });
      vi.mocked(hubAuthService.getCurrentUser).mockResolvedValue({
        ok: true,
        data: user,
      });

      const result = await invoke('auth.me', {});

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.lastLoginAt).toBeNull();
    });

    it('throws on getCurrentUser failure', async () => {
      vi.mocked(hubAuthService.getCurrentUser).mockResolvedValue({
        ok: false,
        error: 'Not authenticated',
      } as HubAuthResult<User>);

      const result = await invoke('auth.me', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });

    it('uses default error message when none provided', async () => {
      vi.mocked(hubAuthService.getCurrentUser).mockResolvedValue({
        ok: false,
      } as HubAuthResult<User>);

      const result = await invoke('auth.me', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get current user');
    });
  });

  // ─── auth.logout ──────────────────────────────────────────────

  describe('auth.logout', () => {
    it('returns success on logout', async () => {
      vi.mocked(hubAuthService.logout).mockResolvedValue({
        ok: true,
        data: { success: true },
      });

      const result = await invoke('auth.logout', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(hubAuthService.logout).toHaveBeenCalled();
    });

    it('propagates logout errors', async () => {
      vi.mocked(hubAuthService.logout).mockRejectedValue(new Error('Network error'));

      const result = await invoke('auth.logout', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  // ─── auth.refresh ─────────────────────────────────────────────

  describe('auth.refresh', () => {
    it('returns refreshed tokens', async () => {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      vi.mocked(hubAuthService.refreshToken).mockResolvedValue({
        ok: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt,
        },
      });

      const result = await invoke('auth.refresh', {
        refreshToken: 'old-refresh-token',
      });

      expect(result.success).toBe(true);
      const data = result.data as { tokens: Record<string, unknown> };
      expect(data.tokens.accessToken).toBe('new-access-token');
      expect(data.tokens.refreshToken).toBe('new-refresh-token');
      expect(typeof data.tokens.expiresIn).toBe('number');
    });

    it('throws on refresh failure', async () => {
      vi.mocked(hubAuthService.refreshToken).mockResolvedValue({
        ok: false,
        error: 'Refresh token expired',
      } as HubAuthResult<AuthRefreshResponse>);

      const result = await invoke('auth.refresh', {
        refreshToken: 'expired-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Refresh token expired');
    });

    it('uses default error message when none provided', async () => {
      vi.mocked(hubAuthService.refreshToken).mockResolvedValue({
        ok: false,
      } as HubAuthResult<AuthRefreshResponse>);

      const result = await invoke('auth.refresh', {
        refreshToken: 'bad-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token refresh failed');
    });

    it('validates input with Zod - missing refreshToken', async () => {
      const result = await invoke('auth.refresh', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('refreshToken');
    });
  });
});
