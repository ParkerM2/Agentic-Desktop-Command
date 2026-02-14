/**
 * Hotkey IPC handlers — get, update, reset global hotkeys
 */

import { DEFAULT_HOTKEYS } from '../../tray/hotkey-manager';

import type { SettingsService } from '../../services/settings/settings-service';
import type { HotkeyManager } from '../../tray/hotkey-manager';
import type { IpcRouter } from '../router';

export function registerHotkeyHandlers(
  router: IpcRouter,
  settingsService: SettingsService,
  hotkeyManager: HotkeyManager,
): void {
  router.handle('hotkeys.get', () => {
    const hotkeys = settingsService.getSettings().hotkeys ?? DEFAULT_HOTKEYS;
    return Promise.resolve(hotkeys);
  });

  router.handle('hotkeys.update', ({ hotkeys }) => {
    settingsService.updateSettings({ hotkeys });
    hotkeyManager.registerFromConfig(hotkeys);
    return Promise.resolve({ success: true });
  });

  router.handle('hotkeys.reset', () => {
    settingsService.updateSettings({ hotkeys: undefined });
    hotkeyManager.registerDefaults();
    return Promise.resolve({ ...DEFAULT_HOTKEYS });
  });
}
