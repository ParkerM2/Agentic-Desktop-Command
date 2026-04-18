/**
 * WebviewPanel — Right panel hosting the Electron <webview> element
 *
 * Border turns red while recording. Accepts a preload script path
 * from the electron-configured test-suite preload.
 */

import { useEffect, useRef } from 'react';

import { cn } from '@renderer/shared/lib/utils';

import { Card, CardContent } from '@ui';

import { useTestSuiteStore } from '../test-suite-store';

// Electron's webview tag is not in the standard React/HTML JSX namespace.
// We use a loose ref type and cast at call sites.
type WebviewRef = {
  addEventListener: (type: string, listener: (event: Electron.IpcMessageEvent) => void) => void;
  removeEventListener: (type: string, listener: (event: Electron.IpcMessageEvent) => void) => void;
} | null;

interface WebviewPanelProps {
  initialUrl?: string;
  preloadPath: string;
}

export function WebviewPanel({ initialUrl = 'about:blank', preloadPath }: WebviewPanelProps) {
  const isRecording = useTestSuiteStore((s) => s.recordingActive);
  const appendRawStep = useTestSuiteStore((s) => s.appendRawStep);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webviewRef = useRef<any>(null);

  // Listen for recorded-step messages from the preload
  useEffect(() => {
    const webview = webviewRef.current as WebviewRef;
    if (!webview) return;

    const handleIpcMessage = (event: Electron.IpcMessageEvent) => {
      if (event.channel === 'test-suite:step') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        appendRawStep(event.args[0]);
      }
    };

    webview.addEventListener('ipc-message', handleIpcMessage);
    return () => {
      webview.removeEventListener('ipc-message', handleIpcMessage);
    };
  }, [appendRawStep]);

  return (
    <Card
      data-testid="webview-panel"
      className={cn(
        'flex h-full flex-col overflow-hidden transition-all',
        isRecording && 'ring-2 ring-destructive ring-offset-1',
      )}
    >
      <CardContent className="min-h-0 flex-1 p-0">
        {/*
          webview is a valid Electron-specific element not in the JSX intrinsic types.
          Cast via any to satisfy the type checker.
        */}
        { }
        {(() => {
          const Webview = 'webview' as unknown as React.ElementType;
          return (
            <Webview
              ref={webviewRef}
              allowpopups="true"
              className="h-full w-full"
              data-testid="webview-element"
              preload={preloadPath}
              src={initialUrl}
            />
          );
        })()}
      </CardContent>
    </Card>
  );
}
