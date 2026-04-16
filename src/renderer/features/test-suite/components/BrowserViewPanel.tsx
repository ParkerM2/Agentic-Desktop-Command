import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { Button, Input } from '@ui';

import { useBrowserViewBounds } from '../hooks/useBrowserViewBounds';
import { useTestSuiteStore } from '../test-suite-store';

interface Props {
  url: string;
  width: number;
  height: number;
  onUrlChange: (u: string) => void;
}

export function BrowserViewPanel({ url, width, height, onUrlChange }: Props) {
  const ref = useBrowserViewBounds(true);
  const recording = useTestSuiteStore((s) => s.recordingActive);

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => { void ipc(TEST_SUITE['BROWSER-VIEW'].BACK, {}); }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => { void ipc(TEST_SUITE['BROWSER-VIEW'].FORWARD, {}); }}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => { void ipc(TEST_SUITE['BROWSER-VIEW'].RELOAD, {}); }}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            void ipc(TEST_SUITE['BROWSER-VIEW'].NAVIGATE, { url });
          }}
        >
          <Input
            className="w-full font-mono"
            value={url}
            onChange={(e) => { onUrlChange(e.target.value); }}
          />
        </form>
        <span className="text-xs text-text-dim font-mono">
          {width} × {height}
        </span>
      </div>
      <div className="relative flex-1">
        <div ref={ref} className="absolute inset-0 bg-bg" />
        {recording ? (
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
          </div>
        ) : null}
      </div>
    </div>
  );
}
