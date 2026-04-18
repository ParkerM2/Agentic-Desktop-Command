/**
 * RunOutputPanel — Streaming run output log panel
 *
 * Shows live output lines while a script is running, and the
 * final report summary once the run completes.
 */

import { useEffect, useRef } from 'react';

import { Terminal } from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Spinner,
  Stack,
  Text,
} from '@ui';

import { useRun } from '../api/useRuns';
import { useTestSuiteStore } from '../test-suite-store';

type BadgeVariant = 'default' | 'destructive' | 'secondary' | 'outline' | 'success';

const RUN_STATUS_VARIANT: Record<string, BadgeVariant> = {
  passed: 'success',
  failed: 'destructive',
  running: 'secondary',
  cancelled: 'outline',
};

export function RunOutputPanel() {
  const isRunning = useTestSuiteStore((s) => s.isRunning);
  const activeRunId = useTestSuiteStore((s) => s.activeRunId);
  const outputLines = useTestSuiteStore((s) => s.outputLines);

  const { data: run } = useRun(activeRunId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputLines]);

  return (
    <Card className="flex h-full flex-col" data-testid="run-output-panel">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Terminal className="size-4" />
          Run Output
          {isRunning ? (
            <Spinner className="ml-auto" size="sm" />
          ) : null}
          {run !== undefined && run !== null && !isRunning ? (
            <Badge
              className="ml-auto"
              variant={RUN_STATUS_VARIANT[run.status] ?? 'secondary'}
            >
              {run.status}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full font-mono" data-testid="run-output-scroll">
          <Stack
            ref={scrollRef}
            className="space-y-0.5 p-3"
            data-testid="run-output-lines"
            gap="none"
          >
            {outputLines.length === 0 && !isRunning ? (
              <Text className="text-xs text-muted-foreground">
                No output yet. Run a script to see logs.
              </Text>
            ) : (
              outputLines.map((entry) => (
                <Text
                  key={entry.id}
                  className="block text-xs text-foreground/80"
                  data-testid={`output-line-${entry.id}`}
                >
                  {entry.text}
                </Text>
              ))
            )}
          </Stack>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
