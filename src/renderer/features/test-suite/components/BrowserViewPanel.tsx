import { AlertCircle, ArrowLeft, ArrowRight, Monitor, RotateCw } from 'lucide-react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { Button, Flex, Input, Stack, Text } from '@ui';

import { useBrowserViewBounds } from '../hooks/useBrowserViewBounds';

interface Props {
  url: string;
  width: number;
  height: number;
  serverRunning: boolean;
  recording: boolean;
  onUrlChange: (u: string) => void;
}

export function BrowserViewPanel({ url, width, height, serverRunning, recording, onUrlChange }: Props) {
  const browserActive = serverRunning || recording;
  const ref = useBrowserViewBounds(browserActive);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => { void ipc(TEST_SUITE['BROWSER-VIEW'].BACK, {}); }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => { void ipc(TEST_SUITE['BROWSER-VIEW'].FORWARD, {}); }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => { void ipc(TEST_SUITE['BROWSER-VIEW'].RELOAD, {}); }}
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            void ipc(TEST_SUITE['BROWSER-VIEW'].NAVIGATE, { url });
          }}
        >
          <Input
            className="h-7 w-full font-mono text-xs"
            value={url}
            onChange={(e) => { onUrlChange(e.target.value); }}
          />
        </form>
        <span className="shrink-0 font-mono text-xs text-text-muted">
          {width}&times;{height}
        </span>
      </div>

      <div className="relative flex-1">
        <div ref={ref} className="absolute inset-0" />

        {recording ? (
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
          </div>
        ) : null}

        {browserActive ? null : (
          <Flex align="center" className="absolute inset-0 bg-card/50" justify="center">
            <Stack align="center" className="text-center" gap="sm">
              <Monitor className="h-10 w-10 text-text-muted/40" />
              <Text className="text-sm text-text-muted">
                Start your dev server to see the browser preview
              </Text>
              <div className="flex items-center gap-1 text-xs text-warning">
                <AlertCircle className="h-3.5 w-3.5" />
                <Text className="text-xs">Click &quot;Start Server&quot; in the toolbar above</Text>
              </div>
            </Stack>
          </Flex>
        )}
      </div>
    </div>
  );
}
