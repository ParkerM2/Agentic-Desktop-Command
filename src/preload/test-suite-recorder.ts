/**
 * Test Suite Recorder Preload
 *
 * Loaded into the BrowserView that hosts the user's running app during
 * recording. Exposes `window.__adcRecorder.send(payload)` which forwards
 * step events to the host webContents via `sendToHost`.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('__adcRecorder', {
  send: (payload: unknown) => ipcRenderer.sendToHost('adc.test-suite.step', payload),
});

console.log('[adc recorder preload] loaded');
