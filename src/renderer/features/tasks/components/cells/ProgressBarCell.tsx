/**
 * ProgressBarCell — AG-Grid cell renderer showing a horizontal progress bar.
 * Color transitions: 0-30 muted, 30-60 warning, 60-100 primary, 100 success.
 */

import type { CustomCellRendererProps } from 'ag-grid-react';

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'var(--success)';
  if (percent >= 60) return 'var(--primary)';
  if (percent >= 30) return 'var(--warning)';
  return 'var(--muted-foreground)';
}

export function ProgressBarCell(props: CustomCellRendererProps) {
  const rawValue = props.value as number | null | undefined;
  const progress = typeof rawValue === 'number' ? rawValue : 0;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${String(clampedProgress)}%`,
            backgroundColor: getProgressColor(clampedProgress),
          }}
        />
      </div>
      <span className="text-muted-foreground min-w-[3ch] text-right text-xs">
        {clampedProgress}%
      </span>
    </div>
  );
}
