/**
 * React Query hooks for settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { SETTINGS } from '@shared/ipc/settings/channels';
import type { SidebarLayoutId } from '@shared/types/layout';

import { ipc } from '@renderer/shared/lib/ipc';
import { useLayoutStore, useThemeStore } from '@renderer/shared/stores';


export const settingsKeys = {
  all: ['settings'] as const,
  app: () => [...settingsKeys.all, 'app'] as const,
  agentSettings: () => [...settingsKeys.all, 'agentSettings'] as const,
  profiles: () => [...settingsKeys.all, 'profiles'] as const,
  webhookConfig: () => [...settingsKeys.all, 'webhookConfig'] as const,
};

/** Fetch app settings */
export function useSettings() {
  const { setMode, setColorTheme, setUiScale, setCustomThemes } = useThemeStore();
  const { setSidebarLayout } = useLayoutStore();

  return useQuery({
    queryKey: settingsKeys.app(),
    queryFn: async () => {
      const settings = await ipc(SETTINGS.GET.ALL, {});
      // Sync theme store on load
      setCustomThemes(settings.customThemes ?? []);
      setMode(settings.theme);
      setColorTheme(settings.colorTheme);
      setUiScale(settings.uiScale);
      if (settings.sidebarLayout) {
        setSidebarLayout(settings.sidebarLayout as SidebarLayoutId);
      }
      if (settings.fontFamily) {
        document.documentElement.style.setProperty('--app-font-sans', settings.fontFamily);
      }
      if (settings.fontSize !== undefined) {
        document.documentElement.style.setProperty(
          '--app-font-size',
          `${String(settings.fontSize)}px`,
        );
      }
      return settings;
    },
    staleTime: 60_000,
  });
}

/** Update settings */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, unknown>) => ipc(SETTINGS.UPDATE.ALL, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.app(), data);
    },
  });
}

/** Fetch API profiles */
export function useProfiles() {
  return useQuery({
    queryKey: settingsKeys.profiles(),
    queryFn: () => ipc(SETTINGS.GET.PROFILES, {}),
    staleTime: 60_000,
  });
}

/** Create a new profile */
export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; apiKey?: string; model?: string }) =>
      ipc(SETTINGS.CREATE.PROFILE, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Update an existing profile */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      updates: { name?: string; apiKey?: string; model?: string };
    }) => ipc(SETTINGS.UPDATE.PROFILE, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Delete a profile */
export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(SETTINGS.DELETE.PROFILE, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Set a profile as the default */
export function useSetDefaultProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(SETTINGS.SET['DEFAULT-PROFILE'], { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Fetch agent settings (maxConcurrentAgents) */
export function useAgentSettings() {
  return useQuery({
    queryKey: settingsKeys.agentSettings(),
    queryFn: () => ipc(SETTINGS.GET['AGENT-SETTINGS'], {}),
    staleTime: 60_000,
  });
}

/** Update agent settings */
export function useUpdateAgentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { maxConcurrentAgents: number }) =>
      ipc(SETTINGS.SET['AGENT-SETTINGS'], data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.agentSettings() });
    },
  });
}
