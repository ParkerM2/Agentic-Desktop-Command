import type { TrendPointSchema } from '@shared/ipc/test-suite';

import { Flex, Text } from '@ui';

import type { z } from 'zod';

type TrendPointType = z.infer<typeof TrendPointSchema>;

interface TrendChartProps {
  data: TrendPointType[];
  width?: number;
  height?: number;
}

export function TrendChart({ data, width = 500, height = 200 }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <Flex align="center" className="h-48" justify="center">
        <Text size="sm" variant="muted">No trend data yet</Text>
      </Flex>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const toY = (val: number) => chartH - (val / maxTotal) * chartH;
  const toX = (i: number) => (data.length > 1 ? i * xStep : chartW / 2);

  const passedPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.passed)}`)
    .join(' ');

  const failedPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.failed)}`)
    .join(' ');

  const yTicks = [0, Math.round(maxTotal / 2), maxTotal];

  return (
    <svg className="w-full" viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              className="stroke-border"
              strokeDasharray="4 4"
              x1={0}
              x2={chartW}
              y1={toY(tick)}
              y2={toY(tick)}
            />
            <text
              className="fill-text-muted text-[10px]"
              dominantBaseline="middle"
              textAnchor="end"
              x={-8}
              y={toY(tick)}
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Passed line */}
        <path className="stroke-green-500" d={passedPath} fill="none" strokeWidth={2} />

        {/* Failed line */}
        <path className="stroke-destructive" d={failedPath} fill="none" strokeWidth={2} />

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (data.length > 14 && i % Math.ceil(data.length / 7) !== 0) return null;
          return (
            <text
              key={d.date}
              className="fill-text-muted text-[10px]"
              dominantBaseline="hanging"
              textAnchor="middle"
              x={toX(i)}
              y={chartH + 8}
            >
              {d.date.slice(5)}
            </text>
          );
        })}

        {/* Dots */}
        {data.map((d, i) => (
          <g key={d.date}>
            <circle className="fill-green-500" cx={toX(i)} cy={toY(d.passed)} r={3} />
            <circle className="fill-destructive" cx={toX(i)} cy={toY(d.failed)} r={3} />
          </g>
        ))}
      </g>

      {/* Legend */}
      <g transform={`translate(${padding.left},${height - 8})`}>
        <circle className="fill-green-500" cx={0} cy={0} r={4} />
        <text className="fill-text-muted text-[10px]" dominantBaseline="middle" x={8} y={0}>Passed</text>
        <circle className="fill-destructive" cx={70} cy={0} r={4} />
        <text className="fill-text-muted text-[10px]" dominantBaseline="middle" x={78} y={0}>Failed</text>
      </g>
    </svg>
  );
}
