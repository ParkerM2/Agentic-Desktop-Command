import { useEffect, useRef, useState } from 'react';

import { useRun, useRuns, useRunScript } from '../../api/useRuns';
import { useTestSuiteConfig } from '../../api/useTestSuiteConfig';
import { useTestSuiteScreenshots } from '../../api/useTestSuiteScreenshots';
import { useTestSuiteScripts } from '../../api/useTestSuiteScripts';
import { useDisplayLines } from '../../hooks/useDisplayLines';
import { useDisplaySteps } from '../../hooks/useDisplaySteps';
import { useRunCompletionToast } from '../../hooks/useRunCompletionToast';
import { formatDuration, getCopyText } from '../../lib/format';
import { useTestSuiteStore } from '../../test-suite-store';

export { formatDuration };

export function useResultsPanel(projectId: string) {
  const { data: scripts = [] } = useTestSuiteScripts(projectId);
  const selectedScriptId = useTestSuiteStore((s) => s.selectedScriptId);
  const setSelectedScriptId = useTestSuiteStore((s) => s.setSelectedScriptId);
  const selectedRunId = useTestSuiteStore((s) => s.selectedRunId);
  const setSelectedRunId = useTestSuiteStore((s) => s.setSelectedRunId);

  const firstScript = scripts.length > 0 ? scripts[0] : undefined;
  const scriptId = selectedScriptId ?? firstScript?.id ?? null;
  const activeScript = scripts.find((s) => s.id === scriptId);

  const { data: config } = useTestSuiteConfig(projectId);
  const { data: runs = [] } = useRuns(scriptId);
  const [activeEnv, setActiveEnv] = useState('default');
  const [outputView, setOutputView] = useState('summary');

  const firstRun = runs.length > 0 ? runs[0] : undefined;
  const activeRunId = selectedRunId ?? firstRun?.id ?? null;
  const { data: runRecord } = useRun(activeRunId);

  const displayLines = useDisplayLines(activeRunId);
  const displaySteps = useDisplaySteps(activeRunId, activeScript?.steps);
  const { data: screenshots } = useTestSuiteScreenshots(activeRunId);

  const runStatus = runRecord?.status ?? (activeRunId ? 'running' : 'pending');
  const runScript = useRunScript();

  useRunCompletionToast(
    runRecord?.status,
    activeScript?.name,
    runRecord?.stepsFailed,
    runRecord?.durationMs,
  );

  const outputRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [displayLines.length]);

  const handleRun = () => {
    if (!scriptId) return;
    const baseUrlOverride =
      activeEnv !== 'default' && config?.environments
        ? config.environments.find((e) => e.name === activeEnv)?.url
        : undefined;
    runScript.mutate({ scriptId, baseUrlOverride }, {
      onSuccess: (data) => setSelectedRunId(data.runId),
    });
  };

  const copyText = getCopyText(outputView, runRecord, displayLines, activeScript?.name);

  return {
    scripts,
    scriptId,
    activeScript,
    config,
    runs,
    activeEnv,
    setActiveEnv,
    outputView,
    setOutputView,
    activeRunId,
    runRecord,
    displayLines,
    displaySteps,
    screenshots: screenshots ?? [],
    runStatus,
    isRunning: runScript.isPending,
    outputRef,
    handleRun,
    copyText,
    setSelectedScriptId,
    setSelectedRunId,
  };
}
