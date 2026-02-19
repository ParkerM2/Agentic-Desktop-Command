/**
 * Integration tests for settings IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> SettingsService -> response
 * with Zod validation at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';

import type { IpcRouter } from '@main/ipc/router';
import type { SettingsService } from '@main/services/settings/settings-service';
import type { AgentSettings, AppSettings, Profile } from '@shared/types';

// ─── Mock Modules ──────────────────────────────────────────────

vi.mock('@main/auth/providers/provider-config', () => ({
  loadOAuthCredentials: vi.fn(() => new Map()),
  saveOAuthCredentials: vi.fn(),
}));

// ─── Mock Factory ──────────────────────────────────────────────

function createMockAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    theme: 'system',
    colorTheme: 'default',
    language: 'en',
    uiScale: 100,
    onboardingCompleted: false,
    ...overrides,
  };
}

function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    name: 'Default',
    apiKey: 'sk-test-key',
    model: 'claude-sonnet-4-6',
    isDefault: true,
    ...overrides,
  };
}

function createMockSettingsService(): SettingsService {
  return {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    getProfiles: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
    setDefaultProfile: vi.fn(),
    getAppVersion: vi.fn(),
    getWebhookConfig: vi.fn(),
    updateWebhookConfig: vi.fn(),
    getAgentSettings: vi.fn(),
    setAgentSettings: vi.fn(),
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

describe('Settings IPC Handlers', () => {
  let service: SettingsService;
  let router: IpcRouter;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];
  let mockProviders: Map<string, { clientId: string; clientSecret: string }>;

  beforeEach(async () => {
    service = createMockSettingsService();
    mockProviders = new Map();

    const testRouter = createTestRouter();
    ({ router, invoke } = testRouter);

    const { registerSettingsHandlers } = await import('@main/ipc/handlers/settings-handlers');
    registerSettingsHandlers(router, service, {
      dataDir: '/mock/data',
      providers: mockProviders as never,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── settings.get ─────────────────────────────────────────────

  describe('settings.get', () => {
    it('returns current settings', async () => {
      const settings = createMockAppSettings();
      vi.mocked(service.getSettings).mockReturnValue(settings);

      const result = await invoke('settings.get', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(settings);
      expect(service.getSettings).toHaveBeenCalled();
    });
  });

  // ─── settings.update ──────────────────────────────────────────

  describe('settings.update', () => {
    it('updates settings and returns merged result', async () => {
      const updated = createMockAppSettings({ theme: 'dark', uiScale: 110 });
      vi.mocked(service.updateSettings).mockReturnValue(updated);

      const result = await invoke('settings.update', { theme: 'dark', uiScale: 110 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
      expect(service.updateSettings).toHaveBeenCalledWith({ theme: 'dark', uiScale: 110 });
    });
  });

  // ─── settings.getProfiles ─────────────────────────────────────

  describe('settings.getProfiles', () => {
    it('returns all profiles', async () => {
      const profiles = [
        createMockProfile({ id: 'p1', name: 'Default', isDefault: true }),
        createMockProfile({ id: 'p2', name: 'Work', isDefault: false }),
      ];
      vi.mocked(service.getProfiles).mockReturnValue(profiles);

      const result = await invoke('settings.getProfiles', {});

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('returns empty array when no profiles', async () => {
      vi.mocked(service.getProfiles).mockReturnValue([]);

      const result = await invoke('settings.getProfiles', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ─── settings.createProfile ───────────────────────────────────

  describe('settings.createProfile', () => {
    it('creates profile with required fields', async () => {
      const profile = createMockProfile({ id: 'new-id', name: 'New Profile' });
      vi.mocked(service.createProfile).mockReturnValue(profile);

      const result = await invoke('settings.createProfile', {
        name: 'New Profile',
      });

      expect(result.success).toBe(true);
      expect(service.createProfile).toHaveBeenCalledWith({ name: 'New Profile' });
    });

    it('creates profile with optional fields', async () => {
      const profile = createMockProfile({
        id: 'new-id',
        name: 'New Profile',
        apiKey: 'sk-test',
        model: 'claude-opus-4-6',
      });
      vi.mocked(service.createProfile).mockReturnValue(profile);

      const result = await invoke('settings.createProfile', {
        name: 'New Profile',
        apiKey: 'sk-test',
        model: 'claude-opus-4-6',
      });

      expect(result.success).toBe(true);
      expect(service.createProfile).toHaveBeenCalledWith({
        name: 'New Profile',
        apiKey: 'sk-test',
        model: 'claude-opus-4-6',
      });
    });

    it('validates input with Zod - missing name', async () => {
      const result = await invoke('settings.createProfile', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('name');
    });
  });

  // ─── settings.updateProfile ───────────────────────────────────

  describe('settings.updateProfile', () => {
    it('updates profile fields', async () => {
      const updated = createMockProfile({ id: 'p1', name: 'Updated Name' });
      vi.mocked(service.updateProfile).mockReturnValue(updated);

      const result = await invoke('settings.updateProfile', {
        id: 'p1',
        updates: { name: 'Updated Name' },
      });

      expect(result.success).toBe(true);
      expect(service.updateProfile).toHaveBeenCalledWith('p1', { name: 'Updated Name' });
    });

    it('validates input with Zod - missing id', async () => {
      const result = await invoke('settings.updateProfile', {
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('id');
    });

    it('validates input with Zod - missing updates', async () => {
      const result = await invoke('settings.updateProfile', {
        id: 'p1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('updates');
    });

    it('handles non-existent profile error', async () => {
      vi.mocked(service.updateProfile).mockImplementation(() => {
        throw new Error('Profile not found: non-existent');
      });

      const result = await invoke('settings.updateProfile', {
        id: 'non-existent',
        updates: { name: 'New Name' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Profile not found');
    });
  });

  // ─── settings.deleteProfile ───────────────────────────────────

  describe('settings.deleteProfile', () => {
    it('deletes profile', async () => {
      vi.mocked(service.deleteProfile).mockReturnValue({ success: true });

      const result = await invoke('settings.deleteProfile', { id: 'p1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(service.deleteProfile).toHaveBeenCalledWith('p1');
    });

    it('validates input with Zod - missing id', async () => {
      const result = await invoke('settings.deleteProfile', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('id');
    });

    it('handles deletion of non-existent profile', async () => {
      vi.mocked(service.deleteProfile).mockImplementation(() => {
        throw new Error('Profile not found: bad-id');
      });

      const result = await invoke('settings.deleteProfile', { id: 'bad-id' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Profile not found');
    });
  });

  // ─── settings.setDefaultProfile ───────────────────────────────

  describe('settings.setDefaultProfile', () => {
    it('sets default profile', async () => {
      vi.mocked(service.setDefaultProfile).mockReturnValue({ success: true });

      const result = await invoke('settings.setDefaultProfile', { id: 'p2' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(service.setDefaultProfile).toHaveBeenCalledWith('p2');
    });

    it('validates input with Zod - missing id', async () => {
      const result = await invoke('settings.setDefaultProfile', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('id');
    });

    it('handles non-existent profile error', async () => {
      vi.mocked(service.setDefaultProfile).mockImplementation(() => {
        throw new Error('Profile not found: bad-id');
      });

      const result = await invoke('settings.setDefaultProfile', { id: 'bad-id' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Profile not found');
    });
  });

  // ─── settings.getOAuthProviders ───────────────────────────────

  describe('settings.getOAuthProviders', () => {
    it('returns OAuth providers with credential status', async () => {
      mockProviders.set('github', { clientId: 'gh-id', clientSecret: 'gh-secret' });
      mockProviders.set('google', { clientId: '', clientSecret: '' });

      const result = await invoke('settings.getOAuthProviders', {});

      expect(result.success).toBe(true);
      const data = result.data as Array<{ name: string; hasCredentials: boolean }>;
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);

      const github = data.find((p) => p.name === 'github');
      expect(github).toBeDefined();
      expect(github?.hasCredentials).toBe(true);
    });

    it('returns empty array when no providers configured', async () => {
      const result = await invoke('settings.getOAuthProviders', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ─── settings.setOAuthProvider ────────────────────────────────

  describe('settings.setOAuthProvider', () => {
    it('saves OAuth provider credentials', async () => {
      mockProviders.set('github', {
        clientId: 'old-id',
        clientSecret: 'old-secret',
      } as never);

      const result = await invoke('settings.setOAuthProvider', {
        name: 'github',
        clientId: 'new-client-id',
        clientSecret: 'new-client-secret',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
    });

    it('validates input with Zod - missing name', async () => {
      const result = await invoke('settings.setOAuthProvider', {
        clientId: 'id',
        clientSecret: 'secret',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('name');
    });

    it('validates input with Zod - missing clientId', async () => {
      const result = await invoke('settings.setOAuthProvider', {
        name: 'github',
        clientSecret: 'secret',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('clientId');
    });

    it('validates input with Zod - missing clientSecret', async () => {
      const result = await invoke('settings.setOAuthProvider', {
        name: 'github',
        clientId: 'id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('clientSecret');
    });
  });

  // ─── settings.getAgentSettings ────────────────────────────────

  describe('settings.getAgentSettings', () => {
    it('returns agent settings', async () => {
      const agentSettings: AgentSettings = { maxConcurrentAgents: 3 };
      vi.mocked(service.getAgentSettings).mockReturnValue(agentSettings);

      const result = await invoke('settings.getAgentSettings', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ maxConcurrentAgents: 3 });
      expect(service.getAgentSettings).toHaveBeenCalled();
    });
  });

  // ─── settings.setAgentSettings ────────────────────────────────

  describe('settings.setAgentSettings', () => {
    it('updates agent settings', async () => {
      vi.mocked(service.setAgentSettings).mockReturnValue({ success: true });

      const result = await invoke('settings.setAgentSettings', {
        maxConcurrentAgents: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(service.setAgentSettings).toHaveBeenCalledWith({ maxConcurrentAgents: 5 });
    });

    it('validates input with Zod - missing maxConcurrentAgents', async () => {
      const result = await invoke('settings.setAgentSettings', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('maxConcurrentAgents');
    });

    it('validates input with Zod - maxConcurrentAgents must be number', async () => {
      const result = await invoke('settings.setAgentSettings', {
        maxConcurrentAgents: 'five',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ─── app.getVersion ───────────────────────────────────────────

  describe('app.getVersion', () => {
    it('returns app version', async () => {
      vi.mocked(service.getAppVersion).mockReturnValue({ version: '1.2.3' });

      const result = await invoke('app.getVersion', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ version: '1.2.3' });
      expect(service.getAppVersion).toHaveBeenCalled();
    });
  });
});
