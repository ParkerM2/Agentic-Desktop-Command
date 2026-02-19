/**
 * Tray Manager — System tray icon and context menu
 *
 * Creates a system tray icon with context menu for quick access.
 * Platform-aware: 16x16 on Windows, 22x22 template on macOS.
 */

import { join } from 'node:path';

import { app, Menu, nativeImage, Tray } from 'electron';
import type { BrowserWindow, MenuItemConstructorOptions, NativeImage } from 'electron';

import { appLogger } from '@main/lib/logger';

// ── Types ────────────────────────────────────────────────────

type TrayStatus = 'idle' | 'notification' | 'working';

export interface TrayManager {
  /** Initialize tray icon and context menu */
  initialize: () => void;
  /** Update tray icon based on agent status */
  setStatus: (status: TrayStatus) => void;
  /** Replace context menu with custom items */
  updateMenu: (items: MenuItemConstructorOptions[]) => void;
  /** Destroy tray and clean up */
  destroy: () => void;
}

interface TrayManagerDeps {
  mainWindow: BrowserWindow;
  onQuickCommand: () => void;
  onShowWindow: () => void;
  onQuit: () => void;
}

// ── Icon Helpers ─────────────────────────────────────────────

const ICON_SIZE_WIN32 = 16;
const ICON_SIZE_DARWIN = 22;

function getIconSize(): number {
  return process.platform === 'darwin' ? ICON_SIZE_DARWIN : ICON_SIZE_WIN32;
}

/**
 * Create a solid-color circle icon for the tray.
 * Uses a canvas-like approach with nativeImage.createFromBuffer.
 */
function createStatusIcon(color: { r: number; g: number; b: number }): NativeImage {
  const size = getIconSize();
  const channels = 4; // RGBA
  const buffer = Buffer.alloc(size * size * channels);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * channels;
      const distanceSquared = (x - centerX) ** 2 + (y - centerY) ** 2;

      if (distanceSquared <= radius ** 2) {
        buffer[index] = color.r;
        buffer[index + 1] = color.g;
        buffer[index + 2] = color.b;
        buffer[index + 3] = 255; // fully opaque
      } else {
        // transparent
        buffer[index] = 0;
        buffer[index + 1] = 0;
        buffer[index + 2] = 0;
        buffer[index + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, {
    width: size,
    height: size,
  });
}

function loadResourceIcon(): NativeImage {
  const resourcePath = join(__dirname, '../../resources/icon-16.png');
  const image = nativeImage.createFromPath(resourcePath);

  if (image.isEmpty()) {
    // Fallback: create a default icon programmatically
    return createStatusIcon({ r: 214, g: 216, b: 118 }); // primary color
  }

  if (process.platform === 'darwin') {
    // macOS template images render as monochrome in menu bar
    image.setTemplateImage(true);
  }

  return image.resize({ width: getIconSize(), height: getIconSize() });
}

const STATUS_COLORS: Record<TrayStatus, { r: number; g: number; b: number }> = {
  idle: { r: 214, g: 216, b: 118 },
  working: { r: 59, g: 130, b: 246 },
  notification: { r: 239, g: 68, b: 68 },
};

// ── Factory ──────────────────────────────────────────────────

export function createTrayManager(deps: TrayManagerDeps): TrayManager {
  let tray: Tray | null = null;
  let currentStatus: TrayStatus = 'idle';

  function buildDefaultMenu(): Menu {
    return Menu.buildFromTemplate([
      {
        label: 'Show / Hide',
        click: deps.onShowWindow,
      },
      {
        label: 'Quick Command',
        accelerator: 'CmdOrCtrl+Shift+Space',
        click: deps.onQuickCommand,
      },
      { type: 'separator' },
      {
        label: 'Quit ADC',
        click: deps.onQuit,
      },
    ]);
  }

  function getTooltipText(): string {
    const base = `ADC v${app.getVersion() || '0.1.0'}`;
    if (currentStatus === 'working') return `${base} — Working...`;
    if (currentStatus === 'notification') return `${base} — New notification`;
    return base;
  }

  return {
    initialize() {
      if (tray !== null) return;

      const icon = loadResourceIcon();
      tray = new Tray(icon);
      tray.setToolTip(getTooltipText());
      tray.setContextMenu(buildDefaultMenu());

      tray.on('double-click', () => {
        deps.onShowWindow();
      });

      appLogger.info('[TrayManager] Tray initialized');
    },

    setStatus(status) {
      if (tray === null) return;

      currentStatus = status;
      const icon = createStatusIcon(STATUS_COLORS[status]);

      if (process.platform === 'darwin') {
        icon.setTemplateImage(true);
      }

      tray.setImage(icon);
      tray.setToolTip(getTooltipText());
    },

    updateMenu(items) {
      if (tray === null) return;
      tray.setContextMenu(Menu.buildFromTemplate(items));
    },

    destroy() {
      if (tray === null) return;

      tray.destroy();
      tray = null;
      appLogger.info('[TrayManager] Tray destroyed');
    },
  };
}
