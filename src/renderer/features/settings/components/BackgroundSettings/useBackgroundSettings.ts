/**
 * useBackgroundSettings — logic hook for BackgroundSettings
 */

import { useEffect, useState } from 'react';

import { APP } from '@shared/ipc/app/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useSettings, useUpdateSettings } from '../../api/useSettings';

export function useBackgroundSettings() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [keepRunning, setKeepRunning] = useState(true);

  useEffect(() => {
    if (settings) {
      setMinimizeToTray(settings.minimizeToTray ?? false);
      setStartMinimized(settings.startMinimized ?? false);
      setKeepRunning(settings.keepRunning ?? true);
      setOpenAtLogin(settings.openAtLogin ?? false);
    }
  }, [settings]);

  function handleOpenAtLogin(checked: boolean) {
    setOpenAtLogin(checked);
    void ipc(APP.SET['LOGIN-SETTING'], { enabled: checked });
    updateSettings.mutate({ openAtLogin: checked });
  }

  function handleMinimizeToTray(checked: boolean) {
    setMinimizeToTray(checked);
    updateSettings.mutate({ minimizeToTray: checked });
  }

  function handleStartMinimized(checked: boolean) {
    setStartMinimized(checked);
    updateSettings.mutate({ startMinimized: checked });
  }

  function handleKeepRunning(checked: boolean) {
    setKeepRunning(checked);
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
