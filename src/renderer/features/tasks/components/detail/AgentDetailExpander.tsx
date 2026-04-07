/**
 * AgentDetailExpander
 *
 * Expandable detail view for a single agent session.
 * Shows session info, recent messages, tool calls, errors, and git diff.
 *
 * Agent session detail is passed as a prop from the parent TeamActivityPanel.
 * Git diff is fetched via React Query (useGitDiff).
 * Recent messages come from EventBridge → React Query cache via useAgentMessagePreviews.
 * Tool calls and errors sections show empty state (no live event source).
 */

import type { AgentError, AgentSessionDetail, ToolCallSummary } from '@shared/types/agent-session-detail';

import type { AgentMessagePreview } from '@renderer/shared/components/EventBridge';

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

import { useAgentMessagePreviews, useGitDiff } from '@features/agent-dashboard';

// ─── Types ───────────────────────────────────────────────

interface AgentDetailExpanderProps {
  sessionId: string;
  agent: AgentSessionDetail;
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
  messages: AgentMessagePreview[];
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
          {messages.map((msg) => (
            <Flex key={msg.id} gap="sm">
              <Text className="shrink-0 font-mono" size="sm" variant="muted">
                {formatTimestamp(msg.timestamp)}
              </Text>
              <Badge size="sm" variant={msg.role === 'assistant' ? 'info' : 'secondary'}>
                {msg.role}
              </Badge>
              <Text className="truncate" size="sm">{msg.preview}</Text>
            </Flex>
          ))}
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
  const { data, isLoading, error, refetch } = useGitDiff(sessionId);
  const diff = data?.diff ?? null;
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <Stack gap="sm">
      <Flex align="center" gap="sm">
        <Heading as="h4">Git Diff</Heading>
        <Button
          disabled={isLoading}
          size="sm"
          variant="outline"
          onClick={() => { void refetch(); }}
        >
          {isLoading ? 'Loading...' : 'Fetch Diff'}
        </Button>
      </Flex>
      {isLoading ? <Spinner size="sm" /> : null}
      {errorMessage ? <Text className="text-destructive" size="sm">{errorMessage}</Text> : null}
      {diff === null ? null : (
        <ScrollArea className="max-h-64">
          <Code className="block whitespace-pre-wrap break-all">{diff}</Code>
        </ScrollArea>
      )}
    </Stack>
  );
}

// ─── AgentDetailExpander ────────────────────────────────

export function AgentDetailExpander({ sessionId, agent }: AgentDetailExpanderProps) {
  // Message previews come from EventBridge → React Query cache
  const messagePreviews = useAgentMessagePreviews(sessionId);
  // Tool calls and errors have no live event writer — always empty
  const toolCalls: ToolCallSummary[] = [];
  const errors: AgentError[] = [];

  return (
    <Stack className="bg-muted/30 px-4 py-3" gap="md">
      <SessionInfoSection agent={agent} />
      <Separator />
      <RecentMessagesSection messages={messagePreviews} />
      <Separator />
      <ToolCallsSection toolCalls={toolCalls} />
      <ErrorsSection errors={errors} />
      <Separator />
      <GitDiffSection sessionId={sessionId} />
    </Stack>
  );
}
