/**
 * ScreenshotGallery — Step-mapped screenshot gallery for the Results panel.
 *
 * Displays screenshots as a grid of cards, each labeled with the step number,
 * type, and label. Clicking a thumbnail opens a full-size lightbox overlay.
 */

import { ImageIcon, X } from 'lucide-react';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Flex,
  Grid,
  ScrollArea,
  Stack,
  Text,
} from '@ui';

import { fileUrl } from '../../lib/screenshot-utils';

import { useScreenshotGallery } from './useScreenshotGallery';

// ─── Types ────────────────────────────────────────────────────

interface ScreenshotItem {
  id: string;
  stepIndex: number;
  stepLabel: string;
  trigger: string;
  filePath: string;
  capturedAt: string;
}

interface ScreenshotGalleryProps {
  screenshots: ScreenshotItem[];
}

// ─── Trigger badge variant ────────────────────────────────────

const TRIGGER_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  nav: 'default',
  click: 'secondary',
  fill: 'secondary',
  assert: 'outline',
  manual: 'outline',
};

// ─── Component ────────────────────────────────────────────────

export function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const vm = useScreenshotGallery(screenshots);

  if (screenshots.length === 0) {
    return (
      <EmptyState
        description="No screenshots were captured during this run."
        icon={ImageIcon}
        title="No screenshots"
      />
    );
  }

  return (
    <>
      <Grid className="gap-3" cols={3}>
        {screenshots.map((ss) => (
          <Button
            key={ss.id}
            className="group flex h-auto flex-col overflow-hidden rounded-md border border-border bg-bg-surface p-0 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            variant="ghost"
            onClick={() => vm.setSelectedId(ss.id)}
          >
            <div className="relative aspect-video w-full overflow-hidden bg-bg-muted">
              <img
                alt={ss.stepLabel}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                src={fileUrl(ss.filePath)}
              />
            </div>
            <Flex align="center" className="gap-2 px-2 py-1.5" wrap="nowrap">
              <Text className="shrink-0 font-mono tabular-nums text-text-dim" size="sm">
                {ss.stepIndex + 1}
              </Text>
              <Badge className="shrink-0 text-[10px]" variant={TRIGGER_VARIANT[ss.trigger] ?? 'outline'}>
                {ss.trigger.toUpperCase()}
              </Badge>
              <Text className="flex-1 truncate" size="sm" variant="muted">
                {ss.stepLabel}
              </Text>
            </Flex>
          </Button>
        ))}
      </Grid>

      {/* Lightbox dialog */}
      <Dialog open={vm.selected !== null} onOpenChange={vm.clearSelection}>
        <DialogContent className="flex h-[85vh] max-w-5xl flex-col">
          <DialogHeader className="shrink-0">
            <Flex align="center" justify="between">
              <DialogTitle>
                Step {(vm.selected?.stepIndex ?? 0) + 1}: {vm.selected?.stepLabel}
              </DialogTitle>
              <Button size="icon" variant="ghost" onClick={vm.clearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </Flex>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {vm.selected ? (
              <Stack className="p-4" gap="md">
                <img
                  alt={vm.selected.stepLabel}
                  className="mx-auto max-w-full rounded-md border border-border"
                  src={fileUrl(vm.selected.filePath)}
                />
                <Flex align="center" className="rounded bg-bg-surface px-3 py-2" gap="lg" wrap="nowrap">
                  <Badge variant={TRIGGER_VARIANT[vm.selected.trigger] ?? 'outline'}>
                    {vm.selected.trigger.toUpperCase()}
                  </Badge>
                  <Text size="sm" variant="muted">{vm.selected.stepLabel}</Text>
                  <Text className="ml-auto" size="sm" variant="muted">
                    {new Date(vm.selected.capturedAt).toLocaleTimeString()}
                  </Text>
                </Flex>
              </Stack>
            ) : null}
          </ScrollArea>

          {/* Thumbnail nav strip */}
          {screenshots.length > 1 ? (
            <Flex className="shrink-0 gap-1 overflow-x-auto border-t border-border p-2" wrap="nowrap">
              {screenshots.map((ss) => (
                <Button
                  key={ss.id}
                  variant="ghost"
                  className={`h-12 w-16 shrink-0 overflow-hidden rounded border-2 p-0 transition-colors ${
                    ss.id === vm.selectedId ? 'border-accent' : 'border-transparent hover:border-border-hover'
                  }`}
                  onClick={() => vm.setSelectedId(ss.id)}
                >
                  <img
                    alt={ss.stepLabel}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    src={fileUrl(ss.filePath)}
                  />
                </Button>
              ))}
            </Flex>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
