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

import { fileUrl } from '../../lib/screenshot-utils';

import { useDiffViewer } from './useDiffViewer';

type ViewMode = 'side-by-side' | 'slider' | 'diff-only';

interface DiffViewerProps {
  baselinePath: string;
  actualPath: string;
  diffPath: string;
  mismatchPercentage: number;
  status: string;
}

export function DiffViewer({
  baselinePath,
  actualPath,
  diffPath,
  mismatchPercentage,
  status,
}: DiffViewerProps) {
  const vm = useDiffViewer({ status });

  return (
    <Stack gap="md">
      {/* Controls */}
      <Flex align="center" gap="md">
        <Badge className={vm.statusColor}>
          {status === 'match' ? 'Match' : `${mismatchPercentage}% diff`}
        </Badge>
        <Select value={vm.viewMode} onValueChange={(v) => vm.setViewMode(v as ViewMode)}>
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
      {vm.viewMode === 'side-by-side' && (
        <Grid cols={3} gap="sm">
          <Stack gap="sm">
            <Text className="mb-1 font-semibold" size="sm" variant="muted">Baseline</Text>
            <img
              alt="Baseline"
              className="rounded border border-border"
              src={fileUrl(baselinePath)}
            />
          </Stack>
          <Stack gap="sm">
            <Text className="mb-1 font-semibold" size="sm" variant="muted">Actual</Text>
            <img
              alt="Actual"
              className="rounded border border-border"
              src={fileUrl(actualPath)}
            />
          </Stack>
          <Stack gap="sm">
            <Text className="mb-1 font-semibold" size="sm" variant="muted">Diff</Text>
            {diffPath ? (
              <img
                alt="Diff"
                className="rounded border border-border"
                src={fileUrl(diffPath)}
              />
            ) : (
              <Flex align="center" className="h-full rounded border border-border" justify="center">
                <Text size="sm" variant="muted">No diff image</Text>
              </Flex>
            )}
          </Stack>
        </Grid>
      )}

      {vm.viewMode === 'slider' && (
        <Stack gap="sm">
          <div className="relative overflow-hidden rounded border border-border">
            <img alt="Actual" className="block w-full" src={fileUrl(actualPath)} />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${vm.sliderValue}%` }}
            >
              <img alt="Baseline" className="block w-full" src={fileUrl(baselinePath)} />
            </div>
            <div
              className="absolute inset-y-0 w-0.5 bg-accent"
              style={{ left: `${vm.sliderValue}%` }}
            />
          </div>
          <Slider
            max={100}
            min={0}
            step={1}
            value={vm.sliderPosition}
            onValueChange={vm.setSliderPosition}
          />
          <Flex justify="between">
            <Text size="sm" variant="muted">Baseline</Text>
            <Text size="sm" variant="muted">Actual</Text>
          </Flex>
        </Stack>
      )}

      {vm.viewMode === 'diff-only' && (
        <Stack gap="sm">
          {diffPath ? (
            <img
              alt="Diff"
              className="rounded border border-border"
              src={fileUrl(diffPath)}
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
