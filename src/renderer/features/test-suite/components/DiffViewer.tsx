import { useState } from 'react';

import {
  Badge,
  Flex,
  Grid,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Stack,
  Text,
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
    <Stack gap="md">
      {/* Controls */}
      <Flex align="center" gap="md">
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
      </Flex>

      {/* View modes */}
      {viewMode === 'side-by-side' && (
        <Grid cols={3} gap="sm">
          <Stack gap="sm">
            <Text className="mb-1 font-semibold" size="sm" variant="muted">Baseline</Text>
            <img
              alt="Baseline"
              className="rounded border border-border"
              src={toFileUrl(baselinePath)}
            />
          </Stack>
          <Stack gap="sm">
            <Text className="mb-1 font-semibold" size="sm" variant="muted">Actual</Text>
            <img
              alt="Actual"
              className="rounded border border-border"
              src={toFileUrl(actualPath)}
            />
          </Stack>
          <Stack gap="sm">
            <Text className="mb-1 font-semibold" size="sm" variant="muted">Diff</Text>
            {diffPath ? (
              <img
                alt="Diff"
                className="rounded border border-border"
                src={toFileUrl(diffPath)}
              />
            ) : (
              <Flex align="center" className="h-full rounded border border-border" justify="center">
                <Text size="sm" variant="muted">No diff image</Text>
              </Flex>
            )}
          </Stack>
        </Grid>
      )}

      {viewMode === 'slider' && (
        <Stack gap="sm">
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
          <Flex justify="between">
            <Text size="sm" variant="muted">Baseline</Text>
            <Text size="sm" variant="muted">Actual</Text>
          </Flex>
        </Stack>
      )}

      {viewMode === 'diff-only' && (
        <Stack gap="sm">
          {diffPath ? (
            <img
              alt="Diff"
              className="rounded border border-border"
              src={toFileUrl(diffPath)}
            />
          ) : (
            <Flex align="center" className="h-48 rounded border border-border" justify="center">
              <Text size="sm" variant="muted">No diff image available</Text>
            </Flex>
          )}
        </Stack>
      )}
    </Stack>
  );
}
