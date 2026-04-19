import { CheckCircle2, Clock, ListPlus, XCircle } from 'lucide-react';

import { Button, Flex, Text } from '@ui';

import { formatDuration } from '../lib/format';


import { ViewReportButton } from './ResultsToolbar';
import { ResultsWorkflowActions } from './ResultsWorkflowActions';

import type { RunRecord } from '../lib/types';

interface RunSummaryBarProps {
  runRecord: RunRecord;
  activeRunId: string | null;
  activeScript?: { id: string; name: string; steps: unknown[] };
  projectId: string;
  onCreateTask: () => void;
}

export function RunSummaryBar({
  runRecord,
  activeRunId,
  activeScript,
  projectId,
  onCreateTask,
}: RunSummaryBarProps) {
  if (runRecord.status === 'running') return null;

  return (
    <Flex align="center" className="border-b border-border bg-bg-surface px-4 py-1.5" gap="lg" wrap="nowrap">
      <Text className="flex items-center gap-1" size="sm" variant="muted">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        {runRecord.stepsPassed ?? 0} passed
      </Text>
      <Text className="flex items-center gap-1" size="sm" variant="muted">
        <XCircle className="h-3.5 w-3.5 text-destructive" />
        {runRecord.stepsFailed ?? 0} failed
      </Text>
      <Text className="flex items-center gap-1" size="sm" variant="muted">
        <Clock className="h-3.5 w-3.5" />
        {formatDuration(runRecord.durationMs ?? 0)}
      </Text>
      {runRecord.reportPath ? (
        <ViewReportButton reportPath={runRecord.reportPath} />
      ) : null}
      <Button size="sm" variant="ghost" onClick={onCreateTask}>
        <ListPlus className="mr-1 h-3 w-3" /> Create Task
      </Button>
      {runRecord.status === 'failed' && (
        <ResultsWorkflowActions
          activeRunId={activeRunId}
          activeScript={activeScript}
          projectId={projectId}
          runRecord={runRecord}
        />
      )}
    </Flex>
  );
}
