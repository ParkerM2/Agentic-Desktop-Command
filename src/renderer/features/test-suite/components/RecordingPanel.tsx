import { useState } from 'react';

import { Circle, Play, Save } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import { Button, Input, PageContent } from '@ui';

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
  const [scriptName, setScriptName] = useState('');
  const recording = useTestSuiteStore((s) => s.recordingActive);
  const setRecordingActive = useTestSuiteStore((s) => s.setRecordingActive);
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);
  const clearSteps = useTestSuiteStore((s) => s.clearSteps);
  const start = useStartRecording();
  const stop = useStopRecording();
  const saveScript = useSaveScript(projectId ?? '');

  if (!projectId || !config) return null;

  const onStart = () => {
    clearSteps();
    start.mutate(
      { url, width: config.viewportWidth, height: config.viewportHeight },
      { onSuccess: () => setRecordingActive(true) },
    );
  };

  const onStop = () => {
    stop.mutate(undefined, { onSuccess: () => setRecordingActive(false) });
  };

  const onSave = () => {
    if (recordedSteps.length === 0) return;
    const name = scriptName.trim() || `Recording ${new Date().toLocaleString()}`;
    saveScript.mutate(
      {
        projectId,
        name,
        steps: recordedSteps.map((r) => r.step),
      },
      {
        onSuccess: () => {
          clearSteps();
          setScriptName('');
        },
      },
    );
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
        <Input
          className="h-7 w-48"
          placeholder="Test name..."
          value={scriptName}
          onChange={(e) => setScriptName(e.target.value)}
        />
        <Button disabled={recordedSteps.length === 0 || saveScript.isPending} size="sm" variant="ghost" onClick={onSave}>
          <Save className="h-3 w-3" /> Save ({recordedSteps.length})
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
