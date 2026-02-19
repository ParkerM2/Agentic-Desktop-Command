/**
 * Quick Input — Small frameless popup for quick commands
 *
 * A tiny always-on-top window with a single text input.
 * Escape closes it, Enter submits the command.
 */

import { BrowserWindow, screen } from 'electron';

import { appLogger } from '@main/lib/logger';

// ── Types ────────────────────────────────────────────────────

export interface QuickInputWindow {
  /** Show the quick input popup, centered on screen */
  show: () => void;
  /** Hide the quick input popup */
  hide: () => void;
  /** Whether the popup is currently visible */
  isVisible: () => boolean;
  /** Destroy the window entirely */
  destroy: () => void;
}

interface QuickInputDeps {
  onCommand: (command: string) => void;
}

// ── Constants ────────────────────────────────────────────────

const WINDOW_WIDTH = 400;
const WINDOW_HEIGHT = 80;

// ── Inline HTML ──────────────────────────────────────────────

function getInlineHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #1a1a2e;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      padding: 12px;
      -webkit-app-region: drag;
    }
    .input-wrapper {
      display: flex;
      width: 100%;
      gap: 8px;
      -webkit-app-region: no-drag;
    }
    input {
      flex: 1;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #0f0f23;
      color: #e2e2e2;
      font-size: 14px;
      outline: none;
    }
    input:focus {
      border-color: #d6d876;
    }
    input::placeholder {
      color: #666;
    }
    button {
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      background: #d6d876;
      color: #1a1a2e;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      background: #e6e886;
    }
  </style>
</head>
<body>
  <div class="input-wrapper">
    <input id="cmd" type="text" placeholder="Type a command..." autofocus />
    <button id="submit" type="button">Go</button>
  </div>
  <script>
    const input = document.getElementById('cmd');
    const submitBtn = document.getElementById('submit');

    function submit() {
      const value = input.value.trim();
      if (value) {
        window.postMessage({ type: 'quick-command', command: value }, '*');
        input.value = '';
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.postMessage({ type: 'quick-close' }, '*');
      } else if (e.key === 'Enter') {
        submit();
      }
    });

    submitBtn.addEventListener('click', submit);
  </script>
</body>
</html>`;
}

// ── Factory ──────────────────────────────────────────────────

export function createQuickInputWindow(deps: QuickInputDeps): QuickInputWindow {
  let win: BrowserWindow | null = null;

  function ensureWindow(): BrowserWindow {
    if (win !== null && !win.isDestroyed()) {
      return win;
    }

    win = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    // Listen for messages from the inline HTML
    win.webContents.on('console-message', (_event, _level, message) => {
      // Messages come through postMessage -> we catch them via did-create-window or IPC
      appLogger.info('[QuickInput] Console:', message);
    });

    // Handle postMessage from the inline HTML via the preload-less approach
    win.webContents.on('did-finish-load', () => {
      // Inject a script to forward postMessage events to the main process
      void win?.webContents.executeJavaScript(`
        window.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'quick-command') {
            document.title = 'CMD:' + event.data.command;
          } else if (event.data && event.data.type === 'quick-close') {
            document.title = 'CLOSE';
          }
        });
      `);
    });

    // Watch for title changes to capture commands from the sandboxed window
    win.on('page-title-updated', (_event, title) => {
      if (title.startsWith('CMD:')) {
        const command = title.slice(4);
        deps.onCommand(command);
        win?.hide();
      } else if (title === 'CLOSE') {
        win?.hide();
      }
    });

    win.on('blur', () => {
      win?.hide();
    });

    win.on('closed', () => {
      win = null;
    });

    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getInlineHtml())}`);

    return win;
  }

  return {
    show() {
      const window = ensureWindow();

      // Center on the primary display
      const display = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = display.workAreaSize;
      const x = Math.round((screenWidth - WINDOW_WIDTH) / 2);
      const y = Math.round((screenHeight - WINDOW_HEIGHT) / 3); // slightly above center

      window.setPosition(x, y);
      window.show();
      window.focus();

      // Focus the input field
      void window.webContents.executeJavaScript(
        `document.getElementById('cmd')?.focus(); document.getElementById('cmd').value = '';`,
      );

      appLogger.info('[QuickInput] Shown');
    },

    hide() {
      if (win !== null && !win.isDestroyed()) {
        win.hide();
      }
    },

    isVisible() {
      if (win === null || win.isDestroyed()) return false;
      return win.isVisible();
    },

    destroy() {
      if (win !== null && !win.isDestroyed()) {
        win.destroy();
      }
      win = null;
      appLogger.info('[QuickInput] Destroyed');
    },
  };
}
