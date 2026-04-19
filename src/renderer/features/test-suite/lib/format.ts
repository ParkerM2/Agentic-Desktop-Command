/**
 * Shared formatting utilities for the test-suite feature.
 */

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = (ms / 1000).toFixed(1);
  return `${secs}s`;
}

export function getOutputLineClass(line: string): string {
  if (line.includes('\u2713') || line.includes('passed')) return 'text-green-500';
  if (line.includes('\u2717') || line.includes('Error') || line.includes('error'))
    return 'text-destructive';
  return 'text-text-muted';
}

interface StepLike {
  type: string;
  url?: string;
  selector?: string;
  value?: string;
  key?: string;
  ms?: number;
  expected?: string;
  context?: { text?: string; label?: string; placeholder?: string; tagName?: string };
}

function shortTarget(step: StepLike): string {
  const ctx = step.context;
  if (ctx) {
    if (ctx.label) return `"${ctx.label}"`;
    if (ctx.text && ctx.text.length < 40) return `"${ctx.text}"`;
    if (ctx.placeholder) return `"${ctx.placeholder}"`;
    if (ctx.tagName) return ctx.tagName;
  }
  // Fallback: last segment of CSS selector
  const sel = step.selector ?? '';
  const parts = sel.split(' > ');
  return parts.at(-1) ?? sel;
}

export function stepToLabel(step: { type: string; [key: string]: unknown }): string {
  const s = step as StepLike;
  switch (s.type) {
    case 'navigate': return `Navigate \u2192 ${s.url ?? ''}`;
    case 'click': return `Click ${shortTarget(s)}`;
    case 'fill': {
      const target = shortTarget(s);
      const val = (s.value ?? '').slice(0, 30);
      return `Fill ${target} \u2192 "${val}"`;
    }
    case 'select': {
      const target = shortTarget(s);
      return `Select ${target} \u2192 ${s.value ?? ''}`;
    }
    case 'press': return `Press ${s.key ?? ''}`;
    case 'wait': return `Wait ${s.ms ?? 0}ms`;
    case 'assert': return `Assert ${shortTarget(s)} = "${s.expected ?? ''}"`;
    default: return s.type;
  }
}
