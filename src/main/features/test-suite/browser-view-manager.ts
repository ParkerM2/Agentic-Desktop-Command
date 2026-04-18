/**
 * BrowserViewManager
 *
 * Owns a single Electron BrowserView overlaid on the main window so the
 * test-suite recorder can display the user's running app inside our UI.
 * Handlers in `recorder-handlers.ts` drive this via the BROWSER-VIEW IPC
 * channels.
 *
 * NOTE: `BrowserView` and its BrowserWindow counterparts are deprecated
 * in Electron 39 in favour of `WebContentsView`, but the recorder spec
 * targets the classic API for now. Deprecation diagnostics are silenced
 * at the file level until the migration task lands.
 */

/* eslint-disable @typescript-eslint/no-deprecated */

import { join } from 'node:path';

import { BrowserView, session } from 'electron';
import type { BrowserWindow } from 'electron';

// electron-vite emits preloads to out/preload/ as .cjs (see
// electron.vite.config.ts + src/main/index.ts createWindow for the
// sibling `../preload/index.cjs` pattern).
const PRELOAD = join(__dirname, '../preload/test-suite-recorder.cjs');

export interface BrowserViewManager {
  create: (url: string, bounds: Electron.Rectangle) => { success: boolean };
  navigate: (url: string) => { success: boolean };
  back: () => { success: boolean };
  forward: () => { success: boolean };
  reload: () => { success: boolean };
  setBounds: (bounds: Electron.Rectangle) => { success: boolean };
  destroy: () => { success: boolean };
  getWebContents: () => Electron.WebContents | null;
  setStepEmitter: (fn: (step: unknown) => void) => void;
}

export function createBrowserViewManager(
  getMainWindow: () => BrowserWindow | null,
): BrowserViewManager {
  let view: BrowserView | null = null;
  const partition = 'persist:test-suite';
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let stepEmitter: (step: unknown) => void = () => {};

  function ensure(): BrowserView {
    if (view) return view;
    view = new BrowserView({
      webPreferences: {
        preload: PRELOAD,
        contextIsolation: true,
        nodeIntegration: false,
        partition,
        webSecurity: true,
      },
    });
    session.fromPartition(partition).setCertificateVerifyProc((req, cb) => {
      if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        cb(0);
      } else {
        cb(-3);
      }
    });
    view.webContents.ipc.on('adc.test-suite.step', (_e, step: unknown) => {
      stepEmitter(step);
    });
    return view;
  }

  return {
    create(url, bounds) {
      const win = getMainWindow();
      if (!win) throw new Error('No main window');
      const v = ensure();
      win.setBrowserView(v);
      v.setBounds(bounds);
      v.setAutoResize({ width: false, height: false });
      void v.webContents.loadURL(url);
      return { success: true };
    },
    navigate(url) {
      void ensure().webContents.loadURL(url);
      return { success: true };
    },
    back() {
      const v = ensure();
      if (v.webContents.canGoBack()) v.webContents.goBack();
      return { success: true };
    },
    forward() {
      const v = ensure();
      if (v.webContents.canGoForward()) v.webContents.goForward();
      return { success: true };
    },
    reload() {
      ensure().webContents.reload();
      return { success: true };
    },
    setBounds(bounds) {
      ensure().setBounds(bounds);
      return { success: true };
    },
    destroy() {
      const win = getMainWindow();
      if (view && win) win.removeBrowserView(view);
      view?.webContents.close();
      view = null;
      return { success: true };
    },
    getWebContents() {
      return view?.webContents ?? null;
    },
    setStepEmitter(fn) {
      stepEmitter = fn;
    },
  };
}
