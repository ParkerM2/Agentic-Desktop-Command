/**
 * BrowserViewPanel — Inline <webview> that displays the user's running app.
 *
 * Uses Electron's <webview> tag (a DOM element) so the browser preview is
 * naturally contained by its parent's CSS layout and provides its own
 * internal scroll. The recorder preload is injected via the `preload`
 * attribute; captured steps arrive through the webview's `ipc-message`
 * event (the preload calls `ipcRenderer.sendToHost`).
 */

import { AlertCircle, ArrowLeft, ArrowRight, Monitor, RotateCw } from 'lucide-react';

import { Button, Flex, Input, Stack, Text } from '@ui';

import { useBrowserViewPanel } from './useBrowserViewPanel';

// Electron's <webview> is not in React's JSX intrinsic types.
const Webview = 'webview' as unknown as React.ElementType;

interface BrowserViewPanelProps {
  url: string;
  width: number;
  height: number;
  serverRunning: boolean;
  recording: boolean;
  onUrlChange: (u: string) => void;
}

export function BrowserViewPanel({ url, width, height, serverRunning, recording, onUrlChange }: BrowserViewPanelProps) {
  const vm = useBrowserViewPanel({ url, serverRunning, recording, onUrlChange });

  return (
    <Stack className="h-full flex-1 overflow-hidden" gap="none">
      {/* Address bar */}
      <Flex align="center" className="h-10 shrink-0 border-b border-border px-3" gap="sm" wrap="nowrap">
        <Flex align="center" gap="sm">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={vm.goBack}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={vm.goForward}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={vm.reload}
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </Flex>
        <form className="flex-1" onSubmit={vm.handleSubmit}>
          <Input
            className="h-7 w-full font-mono text-xs"
            value={url}
            onChange={(e) => { onUrlChange(e.target.value); }}
          />
        </form>
        <Text className="shrink-0 font-mono" size="sm" variant="muted">
          {width}&times;{height}
        </Text>
      </Flex>

      {/* Browser content */}
      <div className="relative flex-1 overflow-hidden">
        {vm.browserActive && vm.preloadUrl && vm.committedUrl ? (
          <>
            <Webview
              ref={vm.webviewRef}
              className="absolute inset-0 h-full w-full"
              partition="persist:test-suite"
              preload={vm.preloadUrl}
              src={vm.committedUrl}
              webpreferences="sandbox=no, contextIsolation=yes"
            />
            {recording ? (
              <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                <div className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
              </div>
            ) : null}
          </>
        ) : (
          <Flex align="center" className="absolute inset-0 bg-card/50" justify="center">
            <Stack align="center" className="text-center" gap="sm">
              <Monitor className="h-10 w-10 text-text-muted/40" />
              <Text className="text-sm text-text-muted">
                Start your dev server to see the browser preview
              </Text>
              <Flex align="center" gap="sm">
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
                <Text className="text-xs text-warning">Click &quot;Start Server&quot; in the toolbar above</Text>
              </Flex>
            </Stack>
          </Flex>
        )}
      </div>
    </Stack>
  );
}
