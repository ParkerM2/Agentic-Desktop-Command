/**
 * BrowserViewPanel — Inline <webview> that displays the user's running app.
 *
 * Uses Electron's <webview> tag (a DOM element) so the browser preview is
 * naturally contained by its parent's CSS layout and provides its own
 * internal scroll. The recorder preload is injected via the `preload`
 * attribute; captured steps arrive through the webview's `ipc-message`
 * event (the preload calls `ipcRenderer.sendToHost`).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { AlertCircle, ArrowLeft, ArrowRight, Monitor, RotateCw } from 'lucide-react';

import type { TestSuiteStep } from '@shared/types/test-suite';

import { Button, Flex, Input, Stack, Text } from '@ui';

import { useTestSuiteStore } from '../test-suite-store';

// Electron's <webview> is not in React's JSX intrinsic types.
const Webview = 'webview' as unknown as React.ElementType;

/** Minimal typing for the subset of Electron.WebviewTag we use. */
interface WebviewElement {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  loadURL: (url: string) => Promise<void>;
  getURL: () => string;
  addEventListener: (type: string, listener: (...args: unknown[]) => void) => void;
  removeEventListener: (type: string, listener: (...args: unknown[]) => void) => void;
}

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
  const webviewRef = useRef<WebviewElement | null>(null);
  const addStep = useTestSuiteStore((s) => s.addStep);
  const stepIndexRef = useRef(0);

  // Stable URL for the webview's src attribute — only updated on
  // explicit navigation (form submit) or internal webview navigation.
  // The address bar text (`url` prop) changes on every keystroke, but
  // we must not pass that to `src` or the webview re-navigates.
  const [committedUrl, setCommittedUrl] = useState('');

  // Sync committedUrl when the URL prop first becomes valid (config loads)
  useEffect(() => {
    if (url && !committedUrl) setCommittedUrl(url);
  }, [url, committedUrl]);

  const preloadUrl = window.preloads.testSuiteRecorder;

  // Navigate on address bar submit
  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      setCommittedUrl(url);
      // Direct imperative call for immediate response
      void webviewRef.current?.loadURL(url);
    },
    [url],
  );

  // Reset step counter when recording starts
  useEffect(() => {
    if (recording) stepIndexRef.current = 0;
  }, [recording]);

  // Listen for recorder-preload step messages + internal navigations
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onIpcMessage = (...args: unknown[]) => {
      const event = args[0] as { channel: string; args: unknown[] };
      if (event.channel !== 'adc.test-suite.step' || !recording) return;
      addStep({
        stepIndex: stepIndexRef.current++,
        step: event.args[0] as TestSuiteStep,
        timestamp: new Date().toISOString(),
      });
    };

    const onNavigate = (...args: unknown[]) => {
      const event = args[0] as { url: string };
      onUrlChange(event.url);
      setCommittedUrl(event.url);
    };

    wv.addEventListener('ipc-message', onIpcMessage);
    wv.addEventListener('did-navigate', onNavigate);
    wv.addEventListener('did-navigate-in-page', onNavigate);

    return () => {
      wv.removeEventListener('ipc-message', onIpcMessage);
      wv.removeEventListener('did-navigate', onNavigate);
      wv.removeEventListener('did-navigate-in-page', onNavigate);
    };
  }, [recording, addStep, onUrlChange]);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Address bar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => webviewRef.current?.goBack()}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => webviewRef.current?.goForward()}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => webviewRef.current?.reload()}
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <form className="flex-1" onSubmit={handleSubmit}>
          <Input
            className="h-7 w-full font-mono text-xs"
            value={url}
            onChange={(e) => { onUrlChange(e.target.value); }}
          />
        </form>
        <Text className="shrink-0 font-mono" size="sm" variant="muted">
          {width}&times;{height}
        </Text>
      </div>

      {/* Browser content */}
      <div className="relative flex-1 overflow-hidden">
        {browserActive && preloadUrl && committedUrl ? (
          <>
            <Webview
              ref={webviewRef}
              className="absolute inset-0 h-full w-full"
              partition="persist:test-suite"
              preload={preloadUrl}
              src={committedUrl}
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
