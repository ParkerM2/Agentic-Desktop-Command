/**
 * Test Suite Recorder Preload
 *
 * Loaded into the BrowserView that hosts the user's running app during
 * recording. Captures user interactions (click, fill, select, press,
 * navigate) and forwards them to the host webContents via `sendToHost`.
 *
 * Emitted steps match the `TestSuiteStep` contract shape exactly — the
 * main-process bridge only adds `stepIndex` and `timestamp` before
 * forwarding to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

import { buildSelector } from './selector-builder';

type PreloadStep =
  | { type: 'navigate'; url: string }
  | { type: 'click'; selector: string }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'select'; selector: string; value: string }
  | { type: 'press'; key: string };

function send(step: PreloadStep): void {
  ipcRenderer.sendToHost('adc.test-suite.step', step);
}

// ── Navigation ────────────────────────────────────────────────

let lastUrl = location.href;
const emitNav = (): void => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    send({ type: 'navigate', url: location.href });
  }
};

window.addEventListener('popstate', emitNav);
window.addEventListener('load', emitNav);

const origPush = history.pushState.bind(history);
history.pushState = function (...args: Parameters<History['pushState']>) {
  origPush(...args);
  emitNav();
};

const origReplace = history.replaceState.bind(history);
history.replaceState = function (...args: Parameters<History['replaceState']>) {
  origReplace(...args);
  emitNav();
};

// ── Click ─────────────────────────────────────────────────────

document.addEventListener(
  'click',
  (e) => {
    const el = e.target as Element | null;
    if (el?.nodeType !== 1) return;
    const { selector } = buildSelector(el);
    send({ type: 'click', selector });
  },
  true,
);

// ── Fill / Select ─────────────────────────────────────────────

document.addEventListener(
  'change',
  (e) => {
    const el = e.target as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) | null;
    if (!el) return;
    const { selector } = buildSelector(el);
    if (el.tagName === 'SELECT') {
      send({ type: 'select', selector, value: el.value });
    } else {
      send({ type: 'fill', selector, value: el.value });
    }
  },
  true,
);

// ── Keyboard ──────────────────────────────────────────────────

document.addEventListener(
  'keydown',
  (e) => {
    if (['Enter', 'Tab', 'Escape'].includes(e.key)) {
      send({ type: 'press', key: e.key });
    }
  },
  true,
);

contextBridge.exposeInMainWorld('__adcRecorder', { active: true });

console.log('[adc recorder preload] loaded');
