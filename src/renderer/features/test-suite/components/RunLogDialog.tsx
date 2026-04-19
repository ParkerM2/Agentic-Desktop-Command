/**
 * RunLogDialog — Full-screen dialog for inspecting test run output in detail.
 *
 * Shows run summary stats, error banner, and scrollable log output
 * with syntax-highlighted lines (pass/fail coloring).
 */

import { useState } from 'react';

import { CheckCircle2, Clock, Copy, Maximize2, XCircle } from 'lucide-react';

import {
  Badge,
  Button,
  Code,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Flex,
  ScrollArea,
  Text,
} from '@ui';

import { formatDuration, getOutputLineClass } from '../lib/format';

import type { RunRecord } from '../lib/types';

interface RunLogDialogProps {
  lines: Array<{ line: string; timestamp: string }>;
  runRecord: RunRecord | null;
  scriptName?: string;
}

export function RunLogDialog({ lines, runRecord, scriptName }: RunLogDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = lines.map((l) => l.line).join('\n');
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" title="Full output" variant="ghost">
          <Maximize2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {scriptName ?? 'Test'} — Run Output
            {runRecord?.status === 'passed' && (
              <Badge variant="success">Passed</Badge>
            )}
            {runRecord?.status === 'failed' && (
              <Badge variant="destructive">Failed</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Summary stats */}
        {runRecord ? (
          <Flex align="center" className="border-b pb-2" gap="lg" wrap="nowrap">
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
            <Button
              className="ml-auto"
              size="sm"
              variant="ghost"
              onClick={handleCopy}
            >
              {copied ? (
                'Copied!'
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </>
              )}
            </Button>
          </Flex>
        ) : null}

        {/* Error banner */}
        {runRecord?.error ? (
          <Text className="rounded-md border border-destructive/30 bg-destructive/10 p-3" size="sm" variant="error">
            {runRecord.error}
          </Text>
        ) : null}

        {/* Log output */}
        <ScrollArea className="min-h-0 flex-1">
          <Code className="block whitespace-pre-wrap p-4">
            {lines.map((l) => (
              <span key={l.timestamp} className={`block ${getOutputLineClass(l.line)}`}>
                {l.line}
              </span>
            ))}
          </Code>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
