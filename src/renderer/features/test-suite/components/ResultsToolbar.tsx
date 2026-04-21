import { useState } from 'react';

import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  ExternalLink,
  Play,
} from 'lucide-react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';
import type { TestSuiteConfig } from '@shared/ipc/test-suite/schemas';

import { ipc } from '@renderer/shared/lib/ipc';

import {
  Badge,
  Button,
  Flex,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from '@ui';

import { RunStatusDot } from './RunStatusBadge';

import type { RunRecord } from '../lib/types';

interface Script {
  id: string;
  name: string;
}

interface Run {
  id: string;
  status: string;
  startedAt: string;
}

const OUTPUT_VIEW = {
  SUMMARY: 'summary',
  SCREENSHOTS: 'screenshots',
  JSON: 'json',
  RAW: 'raw',
} as const;

const VIEW_LABELS: Record<string, string> = {
  [OUTPUT_VIEW.SUMMARY]: 'Summary',
  [OUTPUT_VIEW.SCREENSHOTS]: 'Screenshots',
  [OUTPUT_VIEW.JSON]: 'JSON',
  [OUTPUT_VIEW.RAW]: 'Raw Log',
};

interface ResultsToolbarProps {
  scripts: Script[];
  runs: Run[];
  scriptId: string | null;
  activeRunId: string | null;
  config: TestSuiteConfig | null | undefined;
  activeEnv: string;
  isRunning: boolean;
  runRecord: RunRecord | null | undefined;
  screenshotCount: number;
  outputView: string;
  onScriptChange: (id: string) => void;
  onRunChange: (id: string) => void;
  onEnvChange: (env: string) => void;
  onRun: () => void;
  onViewChange: (view: string) => void;
  copyText: string;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[10px] uppercase tracking-wider" variant="muted">
      {children}
    </Text>
  );
}

export function ResultsToolbar({
  scripts,
  runs,
  scriptId,
  activeRunId,
  config,
  activeEnv,
  isRunning,
  runRecord,
  screenshotCount,
  outputView,
  onScriptChange,
  onRunChange,
  onEnvChange,
  onRun,
  onViewChange,
  copyText,
}: ResultsToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Flex align="end" className="border-b border-border px-3 py-2" gap="sm" wrap="nowrap">
      {/* Script selector */}
      <Stack gap="none">
        <FieldLabel>Script</FieldLabel>
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
      </Stack>

      {/* Run selector */}
      {runs.length > 0 ? (
        <Stack gap="none">
          <FieldLabel>Run</FieldLabel>
          <Select value={activeRunId ?? ''} onValueChange={onRunChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select run..." />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <Text className="flex items-center gap-1.5">
                    <RunStatusDot status={r.status} />
                    {new Date(r.startedAt).toLocaleTimeString()}
                  </Text>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>
      ) : null}

      {/* Environment selector */}
      {config?.environments.length !== undefined && config.environments.length > 0 ? (
        <Stack gap="none">
          <FieldLabel>Environment</FieldLabel>
          <Select value={activeEnv} onValueChange={onEnvChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default ({config.targetUrl})</SelectItem>
              {config.environments.map((env) => (
                <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>
      ) : null}

      {/* Output view selector */}
      {activeRunId ? (
        <Stack gap="none">
          <FieldLabel>View</FieldLabel>
          <Select value={outputView} onValueChange={onViewChange}>
            <SelectTrigger className="w-40">
              <SelectValue>
                {outputView === OUTPUT_VIEW.SCREENSHOTS && screenshotCount > 0
                  ? `Screenshots (${screenshotCount})`
                  : VIEW_LABELS[outputView] ?? 'Summary'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OUTPUT_VIEW.SUMMARY}>Summary</SelectItem>
              <SelectItem value={OUTPUT_VIEW.SCREENSHOTS}>
                Screenshots{screenshotCount > 0 ? ` (${screenshotCount})` : ''}
              </SelectItem>
              <SelectItem value={OUTPUT_VIEW.JSON}>JSON</SelectItem>
              <SelectItem value={OUTPUT_VIEW.RAW}>Raw Log</SelectItem>
            </SelectContent>
          </Select>
        </Stack>
      ) : null}

      {/* Run button */}
      <Button
        disabled={!scriptId || isRunning}
        size="sm"
        variant="control"
        onClick={onRun}
      >
        <Play className="h-3 w-3" /> Run
      </Button>

      {runRecord?.error ? (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" /> Error
        </Badge>
      ) : null}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Copy button */}
      {activeRunId ? (
        <Button size="sm" variant="control" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" /> Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3 w-3" /> Copy
            </>
          )}
        </Button>
      ) : null}

      {/* View Report — far right */}
      {runRecord?.reportPath ? (
        <Button
          size="sm"
          variant="control"
          onClick={() => {
            void ipc(TEST_SUITE.OPEN.REPORT, { reportPath: runRecord.reportPath ?? '' });
          }}
        >
          <ExternalLink className="h-3 w-3" /> View Report
        </Button>
      ) : null}
    </Flex>
  );
}
