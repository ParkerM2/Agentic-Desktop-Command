/**
 * Recorder Preload
 *
 * Injected into the QA recorder webview. Intercepts user interactions and
 * sends structured step messages to the parent frame via window.postMessage.
 *
 * Captured events:
 *   - click      — any element click
 *   - fill       — text input / textarea changes (300 ms debounce)
 *   - press      — special keyboard keys (Enter, Escape, Tab, arrow keys, F-keys)
 *   - navigate   — URL changes (pushState / replaceState / popstate)
 *
 * Exposes: window.__qaRecorder.start() / .stop()
 */

(function () {
  'use strict';

  // ─── Selector Builder ──────────────────────────────────────────

  function cssEscape(value) {
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return CSS.escape(value);
    }
    // Minimal fallback: escape double quotes and backslashes
    return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  }

  function buildSelector(el) {
    const testId = el.getAttribute('data-testid');
    if (testId) return `[data-testid="${cssEscape(testId)}"]`;

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return `[aria-label="${cssEscape(ariaLabel)}"]`;

    const role = el.getAttribute('role');
    if (role) return `[role="${cssEscape(role)}"]`;

    return nthChildSelector(el);
  }

  function nthChildSelector(el) {
    const tag = el.tagName.toLowerCase();
    const parent = el.parentElement;

    if (!parent) return tag;

    const siblings = Array.prototype.filter.call(
      parent.children,
      (c) => c.tagName === el.tagName,
    );

    if (siblings.length === 1) {
      return `${nthChildSelector(parent)} > ${tag}`;
    }

    const index = siblings.indexOf(el) + 1;
    return `${nthChildSelector(parent)} > ${tag}:nth-child(${index})`;
  }

  // ─── Step Dispatch ─────────────────────────────────────────────

  function sendStep(step) {
    window.postMessage({ type: 'qa-recorder-step', step }, '*');
  }

  // ─── Click Handler ─────────────────────────────────────────────

  function onClickCapture(e) {
    const el = e.target;
    if (!(el instanceof Element)) return;
    sendStep({ type: 'click', selector: buildSelector(el) });
  }

  // ─── Fill Handler (debounced) ──────────────────────────────────

  const fillDebounceTimers = new WeakMap();

  function onInputCapture(e) {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;

    const existing = fillDebounceTimers.get(el);
    if (existing !== undefined) clearTimeout(existing);

    const timer = setTimeout(() => {
      fillDebounceTimers.delete(el);
      sendStep({
        type: 'fill',
        selector: buildSelector(el),
        value: el.value,
      });
    }, 300);

    fillDebounceTimers.set(el, timer);
  }

  // ─── Press Handler (special keys only) ────────────────────────

  const SPECIAL_KEYS = new Set([
    'Enter', 'Escape', 'Tab', 'Backspace', 'Delete',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Home', 'End', 'PageUp', 'PageDown',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  ]);

  function onKeydownCapture(e) {
    if (SPECIAL_KEYS.has(e.key)) {
      sendStep({ type: 'press', key: e.key });
    }
  }

  // ─── Navigate Handler ──────────────────────────────────────────

  function emitNavigate() {
    sendStep({ type: 'navigate', url: window.location.href });
  }

  function patchHistory(method) {
    const original = history[method];
    history[method] = function (...args) {
      original.apply(history, args);
      emitNavigate();
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  let active = false;
  let pushStatePatched = false;
  let replaceStatePatched = false;

  function start() {
    if (active) return;
    active = true;

    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('input', onInputCapture, true);
    document.addEventListener('keydown', onKeydownCapture, true);
    window.addEventListener('popstate', emitNavigate);

    if (!pushStatePatched) {
      patchHistory('pushState');
      pushStatePatched = true;
    }
    if (!replaceStatePatched) {
      patchHistory('replaceState');
      replaceStatePatched = true;
    }

    // Emit the current URL as the first navigate step
    emitNavigate();
  }

  function stop() {
    if (!active) return;
    active = false;

    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('input', onInputCapture, true);
    document.removeEventListener('keydown', onKeydownCapture, true);
    window.removeEventListener('popstate', emitNavigate);
  }

  // ─── Public API ────────────────────────────────────────────────

  window.__qaRecorder = { start, stop };
})();
