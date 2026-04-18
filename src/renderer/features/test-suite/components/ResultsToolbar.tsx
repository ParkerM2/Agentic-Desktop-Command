import { AlertTriangle, Play } from 'lucide-react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';
import type { TestSuiteConfig } from '@shared/ipc/test-suite/schemas';

import { ipc } from '@renderer/shared/lib/ipc';

import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import { RunLogDialog } from './RunLogDialog';
import { RunStatusBadge, RunStatusDot } from './RunStatusBadge';

interface Script {
  id: string;
  name: string;
}

interface Run {
  id: string;
  status: string;
  startedAt: string;
}

interface ResultsToolbarProps {
  scripts: Script[];
  runs: Run[];
  scriptId: string | null;
  activeRunId: string | null;
  runStatus: string;
  config: TestSuiteConfig | null | undefined;
  activeEnv: string;
  isRunning: boolean;
  displayLines: Array<{ line: string; timestamp: string }>;
  runRecord: {
    error?: string;
    outputLines: string[];
    status: string;
    durationMs: number;
  } | null | undefined;
  activeScriptName: string | undefined;
  onScriptChange: (id: string) => void;
  onRunChange: (id: string) => void;
  onEnvChange: (env: string) => void;
  onRun: () => void;
}

export function ResultsToolbar({
  scripts,
  runs,
  scriptId,
  activeRunId,
  runStatus,
  config,
  activeEnv,
  isRunning,
  displayLines,
  runRecord,
  activeScriptName,
  onScriptChange,
  onRunChange,
  onEnvChange,
  onRun,
}: ResultsToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <Select value={scriptId ?? ''} onValueChange={onScriptChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select test..." />
        </SelectTrigger>
        <SelectContent>
          {scripts.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {runs.length > 1 && (
        <Select value={activeRunId ?? ''} onValueChange={onRunChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select run..." />
          </SelectTrigger>
          <SelectContent>
            {runs.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                <span className="flex items-center gap-1.5">
                  <RunStatusDot status={r.status} />
                  {new Date(r.startedAt).toLocaleTimeString()}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {Boolean(config?.environments.length) && (
        <Select value={activeEnv} onValueChange={onEnvChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default ({config?.targetUrl})</SelectItem>
            {config?.environments.map((env) => (
              <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        disabled={!scriptId || isRunning}
        size="sm"
        variant="ghost"
        onClick={onRun}
      >
        <Play className="h-3 w-3" /> Run
      </Button>

      <RunStatusBadge status={runStatus} />

      <RunLogDialog
        lines={displayLines}
        runRecord={runRecord ?? null}
        scriptName={activeScriptName}
      />

      {runRecord?.error ? (
        <Badge className="ml-auto" variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" /> Error
        </Badge>
      ) : null}
    </div>
  );
}

export function ViewReportButton({ reportPath }: { reportPath: string }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        void ipc(TEST_SUITE.OPEN.REPORT, { reportPath });
      }}
    >
      View Report
    </Button>
  );
}
