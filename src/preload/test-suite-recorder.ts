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

// Duplicated here because preload scripts run in an isolated context and
// cannot import from @shared.
interface StepContext {
  text?: string;
  label?: string;
  placeholder?: string;
  tagName: string;
  inputType?: string;
}

type PreloadStep =
  | { type: 'navigate'; url: string }
  | { type: 'click'; selector: string; context?: StepContext }
  | { type: 'fill'; selector: string; value: string; context?: StepContext }
  | { type: 'select'; selector: string; value: string; context?: StepContext }
  | { type: 'press'; key: string };

/** Tags that represent interactive elements — click targets should resolve to these. */
const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea']);

/**
 * If `el` is a non-interactive child (svg, path, span, img inside a button/link),
 * climb up to the nearest interactive ancestor so we capture meaningful context.
 */
function resolveClickTarget(el: Element): Element {
  const tag = el.tagName.toLowerCase();
  if (INTERACTIVE_TAGS.has(tag)) return el;

  let cursor: Element | null = el.parentElement;
  while (cursor) {
    if (INTERACTIVE_TAGS.has(cursor.tagName.toLowerCase())) return cursor;
    // Also check for role="button" or role="link"
    const role = cursor.getAttribute('role');
    if (role === 'button' || role === 'link') return cursor;
    cursor = cursor.parentElement;
  }
  return el; // no interactive ancestor found — use original
}

function extractContext(el: Element): StepContext {
  const tagName = el.tagName.toLowerCase();
  const rawText = el.textContent.trim().slice(0, 80);
  const text = rawText || undefined;
  const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
  const label =
    el.getAttribute('aria-label') ??
    (labelEl ? labelEl.textContent.trim() : undefined);
  const placeholder = (el as HTMLInputElement).placeholder || undefined;
  const inputType =
    tagName === 'input' ? (el as HTMLInputElement).type || 'text' : undefined;
  return { tagName, text, label, placeholder, inputType };
}

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
    const raw = e.target as Element | null;
    if (raw?.nodeType !== 1) return;
    const el = resolveClickTarget(raw);
    const { selector } = buildSelector(el);
    send({ type: 'click', selector, context: extractContext(el) });
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
    const context = extractContext(el);
    if (el.tagName === 'SELECT') {
      send({ type: 'select', selector, value: el.value, context });
    } else {
      send({ type: 'fill', selector, value: el.value, context });
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
