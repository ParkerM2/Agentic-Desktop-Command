/**
 * Hotkey IPC handlers — get, update, reset global hotkeys
 */

import { HOTKEYS } from '@shared/ipc/misc/hotkeys.channels';

import { DEFAULT_HOTKEYS } from '../../tray/hotkey-manager';

import type { SettingsService } from "./settings-service";
import type { IpcRouter } from '../../ipc/router';
import type { HotkeyManager } from '../../tray/hotkey-manager';

export function registerHotkeyHandlers(
  router: IpcRouter,
  settingsService: SettingsService,
  hotkeyManager: HotkeyManager,
): void {
  router.handle(HOTKEYS.GET.CONFIG, () => {
    const hotkeys = settingsService.getSettings().hotkeys ?? DEFAULT_HOTKEYS;
    return Promise.resolve(hotkeys);
  });

  router.handle(HOTKEYS.UPDATE.CONFIG, ({ hotkeys }) => {
    settingsService.updateSettings({ hotkeys });
    hotkeyManager.registerFromConfig(hotkeys);
    return Promise.resolve({ success: true });
  });

  router.handle(HOTKEYS.RESET.CONFIG, () => {
    settingsService.updateSettings({ hotkeys: undefined });
    hotkeyManager.registerDefaults();
    return Promise.resolve({ ...DEFAULT_HOTKEYS });
  });
}
