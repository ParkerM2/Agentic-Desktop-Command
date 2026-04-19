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
  return 'text-muted-foreground';
}
