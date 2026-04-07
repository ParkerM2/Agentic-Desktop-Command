/**
 * TeamActivityPanel
 *
 * Table showing all agents working on a given task.
 * Uses useSessionsForTask (React Query) to fetch agent sessions for a slug
 * and renders each agent as an expandable row with an AgentDetailExpander.
 */

import { useState } from 'react';

import type { AgentSessionDetail } from '@shared/types/agent-session-detail';

import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Spinner,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@ui';

import { useSessionsForTask } from '@features/agent-dashboard';

import { AgentDetailExpander } from './AgentDetailExpander';

// ─── Types ───────────────────────────────────────────────

interface TeamActivityPanelProps {
  taskSlug: string;
}

// ─── Helpers ─────────────────────────────────────────────

type StatusBadgeVariant = 'default' | 'destructive' | 'info' | 'secondary' | 'success' | 'warning';

function statusBadgeVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'running': {
      return 'info';
    }
    case 'idle': {
      return 'secondary';
    }
    case 'completed': {
      return 'success';
    }
    case 'failed': {
      return 'destructive';
    }
    case 'needs-attention': {
      return 'warning';
    }
    default: {
      return 'default';
    }
  }
}

function formatTokens(input: number, output: number): string {
  const total = input + output;
  if (total >= 1_000_000) {
    return `${(total / 1_000_000).toFixed(1)}M`;
  }
  if (total >= 1_000) {
    return `${(total / 1_000).toFixed(1)}k`;
  }
  return String(total);
}

function formatDuration(startedAt: string, lastActivityAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(lastActivityAt).getTime();
  const diffMs = end - start;

  if (Number.isNaN(diffMs) || diffMs < 0) return '—';

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes)}m`;
  }
  if (minutes > 0) {
    return `${String(minutes)}m ${String(seconds)}s`;
  }
  return `${String(seconds)}s`;
}

// ─── AgentRow Sub-component ─────────────────────────────

interface AgentRowProps {
  agent: AgentSessionDetail;
  isExpanded: boolean;
  onToggle: () => void;
}

function AgentRow({ agent, isExpanded, onToggle }: AgentRowProps) {
  return (
    <Collapsible asChild open={isExpanded} onOpenChange={onToggle}>
      <>
        <TableRow className="cursor-pointer" onClick={onToggle}>
          <TableCell>
            <CollapsibleTrigger asChild>
              <Text className="font-medium" size="sm">{agent.name}</Text>
            </CollapsibleTrigger>
          </TableCell>
          <TableCell>
            <Text size="sm">{agent.role}</Text>
          </TableCell>
          <TableCell>
            <Badge size="sm" variant={statusBadgeVariant(agent.status)}>
              {agent.status}
            </Badge>
          </TableCell>
          <TableCell>
            <Text className="font-mono" size="sm">
              {formatTokens(agent.tokenUsage.input, agent.tokenUsage.output)}
            </Text>
          </TableCell>
          <TableCell>
            <Text size="sm">
              {formatDuration(agent.startedAt, agent.lastActivityAt)}
            </Text>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <TableRow>
            <TableCell className="p-0" colSpan={5}>
              <AgentDetailExpander agent={agent} sessionId={agent.sessionId} />
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
}

// ─── TeamActivityPanel ──────────────────────────────────

export function TeamActivityPanel({ taskSlug }: TeamActivityPanelProps) {
  const { data: agents = [], isLoading } = useSessionsForTask(taskSlug);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  function handleToggleRow(sessionId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  if (isLoading) {
    return <Spinner size="sm" />;
  }

  if (agents.length === 0) {
    return (
      <Text size="sm" variant="muted">No agents assigned yet</Text>
    );
  }

  return (
    <Stack gap="sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <AgentRow
              key={agent.sessionId}
              agent={agent}
              isExpanded={expandedRows.has(agent.sessionId)}
              onToggle={() => { handleToggleRow(agent.sessionId); }}
            />
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
