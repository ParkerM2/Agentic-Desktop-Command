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

export function stepToLabel(step: { type: string; [key: string]: unknown }): string {
  switch (step.type) {
    case 'navigate': return `Navigate \u2192 ${step.url as string}`;
    case 'click': return `Click ${step.selector as string}`;
    case 'fill': return `Fill ${step.selector as string}`;
    case 'select': return `Select ${step.selector as string}`;
    case 'press': return `Press ${step.key as string}`;
    case 'wait': return `Wait ${step.ms as number}ms`;
    case 'assert': return `Assert ${step.selector as string}`;
    default: return step.type;
  }
}
