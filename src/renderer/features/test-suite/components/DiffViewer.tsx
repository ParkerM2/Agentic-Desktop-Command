import { useState } from 'react';

import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from '@ui';

interface DiffViewerProps {
  baselinePath: string;
  actualPath: string;
  diffPath: string;
  mismatchPercentage: number;
  status: string;
}

type ViewMode = 'side-by-side' | 'slider' | 'diff-only';

function toFileUrl(filePath: string): string {
  return `file://${filePath.replaceAll('\\', '/')}`;
}

function getStatusColor(status: string): string {
  if (status === 'match') return 'bg-green-600';
  if (status === 'mismatch') return 'bg-destructive';
  return 'bg-yellow-600';
}

export function DiffViewer({
  baselinePath,
  actualPath,
  diffPath,
  mismatchPercentage,
  status,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState<number[]>([50]);

  const statusColor = getStatusColor(status);

  const sliderValue = sliderPosition[0] ?? 50;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <Badge className={statusColor}>
          {status === 'match' ? 'Match' : `${mismatchPercentage}% diff`}
        </Badge>
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="side-by-side">Side by Side</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
            <SelectItem value="diff-only">Diff Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* View modes */}
      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-text-muted">Baseline</p>
            <img
              alt="Baseline"
              className="rounded border border-border"
              src={toFileUrl(baselinePath)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-text-muted">Actual</p>
            <img
              alt="Actual"
              className="rounded border border-border"
              src={toFileUrl(actualPath)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-text-muted">Diff</p>
            {diffPath ? (
              <img
                alt="Diff"
                className="rounded border border-border"
                src={toFileUrl(diffPath)}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded border border-border text-sm text-text-muted">
                No diff image
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'slider' && (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded border border-border">
            <img alt="Actual" className="block w-full" src={toFileUrl(actualPath)} />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderValue}%` }}
            >
              <img alt="Baseline" className="block w-full" src={toFileUrl(baselinePath)} />
            </div>
            <div
              className="absolute inset-y-0 w-0.5 bg-accent"
              style={{ left: `${sliderValue}%` }}
            />
          </div>
          <Slider
            max={100}
            min={0}
            step={1}
            value={sliderPosition}
            onValueChange={setSliderPosition}
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>Baseline</span>
            <span>Actual</span>
          </div>
        </div>
      )}

      {viewMode === 'diff-only' && (
        <div>
          {diffPath ? (
            <img
              alt="Diff"
              className="rounded border border-border"
              src={toFileUrl(diffPath)}
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded border border-border text-sm text-text-muted">
              No diff image available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
