/**
 * React Query hooks for settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';
import { useThemeStore } from '@renderer/shared/stores';

export const settingsKeys = {
  all: ['settings'] as const,
  app: () => [...settingsKeys.all, 'app'] as const,
  profiles: () => [...settingsKeys.all, 'profiles'] as const,
  webhookConfig: () => [...settingsKeys.all, 'webhookConfig'] as const,
};

/** Fetch app settings */
export function useSettings() {
  const { setMode, setColorTheme, setUiScale } = useThemeStore();

  return useQuery({
    queryKey: settingsKeys.app(),
    queryFn: async () => {
      const settings = await ipc('settings.get', {});
      // Sync theme store on load
      setMode(settings.theme);
      setColorTheme(settings.colorTheme);
      setUiScale(settings.uiScale);
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
    mutationFn: (updates: Record<string, unknown>) => ipc('settings.update', updates),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.app(), data);
    },
  });
}

/** Fetch API profiles */
export function useProfiles() {
  return useQuery({
    queryKey: settingsKeys.profiles(),
    queryFn: () => ipc('settings.getProfiles', {}),
    staleTime: 60_000,
  });
}

/** Create a new profile */
export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; apiKey?: string; model?: string }) =>
      ipc('settings.createProfile', data),
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
    }) => ipc('settings.updateProfile', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Delete a profile */
export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc('settings.deleteProfile', { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Set a profile as the default */
export function useSetDefaultProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc('settings.setDefaultProfile', { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}
