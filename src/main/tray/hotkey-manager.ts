/**
 * Hotkey Manager — Global keyboard shortcuts
 *
 * Registers system-wide hotkeys via Electron's globalShortcut.
 * Must unregister all on app quit to avoid orphaned registrations.
 */

import { globalShortcut } from 'electron';
import type { BrowserWindow } from 'electron';

import type { QuickInputWindow } from './quick-input';

// ── Types ────────────────────────────────────────────────────

interface RegisteredHotkey {
  accelerator: string;
  label: string;
}

export interface HotkeyManager {
  /** Register default hotkeys (Quick Command, Quick Note, Quick Task) */
  registerDefaults: () => void;
  /** Register hotkeys from a config map (unregisters all existing first) */
  registerFromConfig: (config: Record<string, string>) => void;
  /** Register a custom hotkey with an accelerator string */
  registerCustom: (accelerator: string, label: string, callback: () => void) => boolean;
  /** Unregister all global shortcuts */
  unregisterAll: () => void;
  /** Get list of currently registered hotkeys */
  getRegistered: () => RegisteredHotkey[];
}

interface HotkeyManagerDeps {
  quickInput: QuickInputWindow;
  getMainWindow: () => BrowserWindow | null;
}

// ── Constants ────────────────────────────────────────────────

export const DEFAULT_HOTKEYS: Record<string, string> = {
  quickCommand: 'CmdOrCtrl+Shift+Space',
  quickNote: 'CmdOrCtrl+Shift+N',
  quickTask: 'CmdOrCtrl+Shift+T',
};

// ── Factory ──────────────────────────────────────────────────

export function createHotkeyManager(deps: HotkeyManagerDeps): HotkeyManager {
  const registered: RegisteredHotkey[] = [];

  function tryRegister(accelerator: string, label: string, callback: () => void): boolean {
    if (globalShortcut.isRegistered(accelerator)) {
      console.warn(`[HotkeyManager] Hotkey already registered: ${accelerator}`);
      return false;
    }

    const success = globalShortcut.register(accelerator, callback);
    if (success) {
      registered.push({ accelerator, label });
      console.log(`[HotkeyManager] Registered: ${accelerator} (${label})`);
    } else {
      console.warn(`[HotkeyManager] Failed to register: ${accelerator}`);
    }

    return success;
  }

  function showMainWindow(): void {
    const win = deps.getMainWindow();
    if (!win) return;
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.focus();
  }

  function getCallbackForAction(action: string): (() => void) | undefined {
    switch (action) {
      case 'quickCommand': {
        return () => {
          if (deps.quickInput.isVisible()) {
            deps.quickInput.hide();
          } else {
            deps.quickInput.show();
          }
        };
      }
      case 'quickNote': {
        return () => {
          showMainWindow();
          console.log('[HotkeyManager] Quick Note triggered');
        };
      }
      case 'quickTask': {
        return () => {
          showMainWindow();
          console.log('[HotkeyManager] Quick Task triggered');
        };
      }
      default: {
        return undefined;
      }
    }
  }

  return {
    registerDefaults() {
      for (const [action, accelerator] of Object.entries(DEFAULT_HOTKEYS)) {
        const callback = getCallbackForAction(action);
        if (callback) {
          tryRegister(accelerator, action, callback);
        }
      }
    },

    registerFromConfig(config) {
      // Unregister all existing hotkeys first
      globalShortcut.unregisterAll();
      registered.length = 0;
      console.log('[HotkeyManager] Cleared all hotkeys for re-registration');

      for (const [action, accelerator] of Object.entries(config)) {
        const callback = getCallbackForAction(action);
        if (callback) {
          tryRegister(accelerator, action, callback);
        } else {
          console.warn(`[HotkeyManager] Unknown action: ${action}`);
        }
      }
    },

    registerCustom(accelerator, label, callback) {
      return tryRegister(accelerator, label, callback);
    },

    unregisterAll() {
      globalShortcut.unregisterAll();
      const count = registered.length;
      registered.length = 0;
      console.log(`[HotkeyManager] Unregistered ${String(count)} hotkeys`);
    },

    getRegistered() {
      return [...registered];
    },
  };
}
