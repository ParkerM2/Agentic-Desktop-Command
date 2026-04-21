/**
 * useBackgroundSettings — logic hook for BackgroundSettings
 */

import { useMemo } from 'react';

import { APP } from '@shared/ipc/app/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useSettings, useUpdateSettings } from '../../api/useSettings';
import { useBooleanSettingsSync } from '../../hooks/useBooleanSettingsSync';

const FIELDS = ['openAtLogin', 'minimizeToTray', 'startMinimized', 'keepRunning'] as const;
const DEFAULTS: Record<(typeof FIELDS)[number], boolean> = {
  openAtLogin: false,
  minimizeToTray: false,
  startMinimized: false,
  keepRunning: true,
};

export function useBackgroundSettings() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const source = useMemo(
    () =>
      settings
        ? {
            openAtLogin: settings.openAtLogin ?? undefined,
            minimizeToTray: settings.minimizeToTray ?? undefined,
            startMinimized: settings.startMinimized ?? undefined,
            keepRunning: settings.keepRunning ?? undefined,
          }
        : undefined,
    [settings],
  );

  const { openAtLogin, minimizeToTray, startMinimized, keepRunning, setField } =
    useBooleanSettingsSync(FIELDS, source, DEFAULTS);

  function handleOpenAtLogin(checked: boolean) {
    setField('openAtLogin', checked);
    void ipc(APP.SET['LOGIN-SETTING'], { enabled: checked });
    updateSettings.mutate({ openAtLogin: checked });
  }

  function handleMinimizeToTray(checked: boolean) {
    setField('minimizeToTray', checked);
    updateSettings.mutate({ minimizeToTray: checked });
  }

  function handleStartMinimized(checked: boolean) {
    setField('startMinimized', checked);
    updateSettings.mutate({ startMinimized: checked });
  }

  function handleKeepRunning(checked: boolean) {
    setField('keepRunning', checked);
    updateSettings.mutate({ keepRunning: checked });
  }

  return {
    openAtLogin,
    minimizeToTray,
    startMinimized,
    keepRunning,
    handleOpenAtLogin,
    handleMinimizeToTray,
    handleStartMinimized,
    handleKeepRunning,
  };
}
