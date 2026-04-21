import { useCallback, useEffect, useRef, useState } from 'react';

import type { TestSuiteStep } from '@shared/types/test-suite';

import { useTestSuiteStore } from '../../test-suite-store';

/** Minimal typing for the subset of Electron.WebviewTag we use. */
export interface WebviewElement {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  loadURL: (url: string) => Promise<void>;
  getURL: () => string;
  addEventListener: (type: string, listener: (...args: unknown[]) => void) => void;
  removeEventListener: (type: string, listener: (...args: unknown[]) => void) => void;
}

interface UseBrowserViewPanelProps {
  url: string;
  serverRunning: boolean;
  recording: boolean;
  onUrlChange: (u: string) => void;
}

export function useBrowserViewPanel({ url, serverRunning, recording, onUrlChange }: UseBrowserViewPanelProps) {
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

  const goBack = () => webviewRef.current?.goBack();
  const goForward = () => webviewRef.current?.goForward();
  const reload = () => webviewRef.current?.reload();

  return {
    browserActive,
    webviewRef,
    committedUrl,
    preloadUrl,
    handleSubmit,
    goBack,
    goForward,
    reload,
  };
}
