/**
 * ActivitySparklineCell — AG-Grid cell renderer with SVG polyline sparkline.
 * Renders a mini chart from a number array (~120px wide, 28px tall).
 */

import type { CustomCellRendererProps } from 'ag-grid-react';

const SPARKLINE_WIDTH = 120;
const SPARKLINE_HEIGHT = 28;

export function ActivitySparklineCell(props: CustomCellRendererProps) {
  const data: number[] = Array.isArray(props.value) ? (props.value as number[]) : [];

  if (data.length === 0) {
    return <span className="text-muted-foreground text-xs">No data</span>;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min;
  const effectiveRange = range === 0 ? 1 : range;

  const points = data
    .map((val, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * SPARKLINE_WIDTH : SPARKLINE_WIDTH / 2;
      const y = SPARKLINE_HEIGHT - ((val - min) / effectiveRange) * SPARKLINE_HEIGHT;
      return `${String(x)},${String(y)}`;
    })
    .join(' ');

  return (
    <div className="flex items-center py-1">
      <svg className="overflow-visible" height={SPARKLINE_HEIGHT} width={SPARKLINE_WIDTH}>
        <polyline
          fill="none"
          points={points}
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
