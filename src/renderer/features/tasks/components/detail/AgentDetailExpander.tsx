/**
 * AgentDetailExpander
 *
 * Expandable detail view for a single agent session.
 * Shows session info, recent messages, tool calls, errors, and git diff.
 * All data sourced from the global useAgentContext store.
 */

import { useCallback, useState } from 'react';

import type { AgentError, AgentSessionDetail, ToolCallSummary } from '@shared/types/agent-session-detail';

import { useAgentContext } from '@renderer/shared/stores/agent-context-store';

import {
  Badge,
  Button,
  Code,
  Flex,
  Heading,
  ScrollArea,
  Separator,
  Spinner,
  Stack,
  Text,
} from '@ui';

// ─── Types ───────────────────────────────────────────────

interface AgentDetailExpanderProps {
  sessionId: string;
}

// ─── Helpers ─────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

function formatDurationFull(startedAt: string, lastActivityAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(lastActivityAt).getTime();
  const diffMs = end - start;

  if (Number.isNaN(diffMs) || diffMs < 0) return '—';

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${String(hours)}h`);
  if (minutes > 0) parts.push(`${String(minutes)}m`);
  parts.push(`${String(seconds)}s`);

  return parts.join(' ');
}

function truncateInput(input: string, maxLen = 80): string {
  if (input.length <= maxLen) return input;
  return `${input.slice(0, maxLen)}...`;
}

// ─── SessionInfoSection ─────────────────────────────────

interface SessionInfoSectionProps {
  agent: AgentSessionDetail;
}

function SessionInfoSection({ agent }: SessionInfoSectionProps) {
  const totalTokens = agent.tokenUsage.input + agent.tokenUsage.output;
  const duration = formatDurationFull(agent.startedAt, agent.lastActivityAt);

  return (
    <Stack gap="sm">
      <Heading as="h4">Session Info</Heading>
      <Flex gap="lg" wrap="wrap">
        <Flex align="center" gap="sm">
          <Text size="sm" variant="muted">Model:</Text>
          <Code>{agent.model}</Code>
        </Flex>
        <Flex align="center" gap="sm">
          <Text size="sm" variant="muted">Branch:</Text>
          <Code>{agent.branch ?? '—'}</Code>
        </Flex>
        <Flex align="center" gap="sm">
          <Text size="sm" variant="muted">Exit Code:</Text>
          <Text size="sm">{agent.exitCode === null ? '—' : String(agent.exitCode)}</Text>
        </Flex>
        <Flex align="center" gap="sm">
          <Text size="sm" variant="muted">Tokens:</Text>
          <Text size="sm">{totalTokens.toLocaleString()}</Text>
        </Flex>
        <Flex align="center" gap="sm">
          <Text size="sm" variant="muted">Duration:</Text>
          <Text size="sm">{duration}</Text>
        </Flex>
      </Flex>
    </Stack>
  );
}

// ─── RecentMessagesSection ──────────────────────────────

interface RecentMessagesSectionProps {
  messages: unknown[];
}

interface MessageShape {
  timestamp?: string;
  role?: string;
  content?: string;
}

function isMessageShape(value: unknown): value is MessageShape {
  return typeof value === 'object' && value !== null;
}

function RecentMessagesSection({ messages }: RecentMessagesSectionProps) {
  if (messages.length === 0) {
    return (
      <Stack gap="sm">
        <Heading as="h4">Recent Messages</Heading>
        <Text size="sm" variant="muted">No messages yet</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Heading as="h4">Recent Messages</Heading>
      <ScrollArea className="max-h-48">
        <Stack gap="sm">
          {messages.map((msg, idx) => {
            const m = isMessageShape(msg) ? msg : {};
            const timestamp = typeof m.timestamp === 'string' ? formatTimestamp(m.timestamp) : '';
            const role = typeof m.role === 'string' ? m.role : 'unknown';
            const content = typeof m.content === 'string' ? m.content : JSON.stringify(msg);

            return (
              <Flex key={`msg-${String(idx)}`} gap="sm">
                {timestamp ? (
                  <Text className="shrink-0 font-mono" size="sm" variant="muted">{timestamp}</Text>
                ) : null}
                <Badge size="sm" variant={role === 'assistant' ? 'info' : 'secondary'}>
                  {role}
                </Badge>
                <Text className="truncate" size="sm">{content}</Text>
              </Flex>
            );
          })}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

// ─── ToolCallsSection ───────────────────────────────────

interface ToolCallsSectionProps {
  toolCalls: ToolCallSummary[];
}

function ToolCallsSection({ toolCalls }: ToolCallsSectionProps) {
  if (toolCalls.length === 0) {
    return (
      <Stack gap="sm">
        <Heading as="h4">Tool Calls</Heading>
        <Text size="sm" variant="muted">No tool calls recorded</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Heading as="h4">Tool Calls</Heading>
      <ScrollArea className="max-h-48">
        <Stack gap="sm">
          {toolCalls.map((tc) => (
            <Flex key={tc.id} align="center" gap="sm">
              <Text className="shrink-0 font-mono" size="sm" variant="muted">
                {formatTimestamp(tc.timestamp)}
              </Text>
              <Code>{tc.toolName}</Code>
              <Text className="truncate" size="sm" variant="muted">
                {truncateInput(tc.inputSummary)}
              </Text>
              <Badge size="sm" variant={tc.success ? 'success' : 'destructive'}>
                {tc.success ? 'ok' : 'fail'}
              </Badge>
            </Flex>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

// ─── ErrorsSection ──────────────────────────────────────

interface ErrorsSectionProps {
  errors: AgentError[];
}

function ErrorsSection({ errors }: ErrorsSectionProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <Stack gap="sm">
      <Heading as="h4">Errors</Heading>
      <Stack gap="sm">
        {errors.map((err, idx) => (
          <Flex key={`err-${String(idx)}`} className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2" gap="sm">
            <Text className="shrink-0 font-mono" size="sm" variant="muted">
              {formatTimestamp(err.timestamp)}
            </Text>
            <Text className="text-destructive" size="sm">{err.message}</Text>
          </Flex>
        ))}
      </Stack>
    </Stack>
  );
}

// ─── GitDiffSection ─────────────────────────────────────

interface GitDiffSectionProps {
  sessionId: string;
}

function GitDiffSection({ sessionId }: GitDiffSectionProps) {
  const [diff, setDiff] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchDiff = useCallback(() => {
    setIsLoading(true);
    setError(null);

    void useAgentContext
      .getState()
      .fetchGitDiff(sessionId)
      .then((result) => {
        setDiff(result);
        setIsLoading(false);
        return result;
      })
      .catch((fetchError: unknown) => {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to fetch diff';
        setError(message);
        setIsLoading(false);
      });
  }, [sessionId]);

  return (
    <Stack gap="sm">
      <Flex align="center" gap="sm">
        <Heading as="h4">Git Diff</Heading>
        <Button disabled={isLoading} size="sm" variant="outline" onClick={handleFetchDiff}>
          {isLoading ? 'Loading...' : 'Fetch Diff'}
        </Button>
      </Flex>
      {isLoading ? <Spinner size="sm" /> : null}
      {error ? <Text className="text-destructive" size="sm">{error}</Text> : null}
      {diff === null ? null : (
        <ScrollArea className="max-h-64">
          <Code className="block whitespace-pre-wrap break-all">{diff}</Code>
        </ScrollArea>
      )}
    </Stack>
  );
}

// ─── AgentDetailExpander ────────────────────────────────

export function AgentDetailExpander({ sessionId }: AgentDetailExpanderProps) {
  const agent = useAgentContext((s) =>
    s.agentSessions.find((a) => a.sessionId === sessionId),
  );
  const messages = useAgentContext((s) => s.recentMessages[sessionId] ?? []);
  const toolCalls = useAgentContext((s) => s.recentToolCalls[sessionId] ?? []);
  const errors = useAgentContext((s) => s.errors[sessionId] ?? []);

  if (!agent) {
    return (
      <Stack className="px-4 py-3" gap="sm">
        <Text size="sm" variant="muted">Session not found</Text>
      </Stack>
    );
  }

  return (
    <Stack className="bg-muted/30 px-4 py-3" gap="md">
      <SessionInfoSection agent={agent} />
      <Separator />
      <RecentMessagesSection messages={messages} />
      <Separator />
      <ToolCallsSection toolCalls={toolCalls} />
      <ErrorsSection errors={errors} />
      <Separator />
      <GitDiffSection sessionId={sessionId} />
    </Stack>
  );
}
