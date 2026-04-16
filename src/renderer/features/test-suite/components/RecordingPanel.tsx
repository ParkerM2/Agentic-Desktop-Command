import { useState } from 'react';

import { Circle, Play, Save } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import { Button, PageContent } from '@ui';

import { useSaveScript } from '../api/useSaveScript';
import { useStartRecording } from '../api/useStartRecording';
import { useStopRecording } from '../api/useStopRecording';
import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteStore } from '../test-suite-store';

import { BrowserViewPanel } from './BrowserViewPanel';
import { StepList } from './StepList';

export function RecordingPanel() {
  const { projectId } = useLooseParams();
  const { data: config } = useTestSuiteConfig(projectId ?? '');
  const [url, setUrl] = useState(config?.targetUrl ?? '');
  const recording = useTestSuiteStore((s) => s.recordingActive);
  const setRecordingActive = useTestSuiteStore((s) => s.setRecordingActive);
  const start = useStartRecording();
  const stop = useStopRecording();
  // TODO: wire save onClick once StepList steps are hoisted to shared state
  const _save = useSaveScript(projectId ?? '');

  if (!projectId || !config) return null;

  const onStart = () => {
    start.mutate(
      { url, width: config.viewportWidth, height: config.viewportHeight },
      { onSuccess: () => setRecordingActive(true) },
    );
  };

  const onStop = () => {
    stop.mutate(undefined, { onSuccess: () => setRecordingActive(false) });
  };

  return (
    <PageContent className="p-0">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">Recording</h3>
        {recording ? (
          <Button size="sm" variant="destructive" onClick={onStop}>
            <Circle className="h-3 w-3 fill-current" /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={onStart}>
            <Circle className="h-3 w-3 fill-destructive text-destructive" /> Record
          </Button>
        )}
        <Button disabled={!recording} size="sm" variant="ghost">
          <Save className="h-3 w-3" /> Save
        </Button>
        <Button size="sm" variant="ghost">
          <Play className="h-3 w-3" /> Run
        </Button>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-80 border-r border-border overflow-y-auto">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-text-muted">
            Steps
          </div>
          <StepList />
        </div>
        <BrowserViewPanel
          height={config.viewportHeight}
          url={url}
          width={config.viewportWidth}
          onUrlChange={setUrl}
        />
      </div>
    </PageContent>
  );
}
