import type { AdcDatabase } from '../db';

export interface CommandSource {
  type: 'ui' | 'agent' | 'system';
  id?: string;
  name?: string;
}

export interface BusResult<T = unknown> {
  commandId: string;
  status: 'success' | 'error';
  output: T;
  durationMs: number;
  error?: string;
}

export interface CommandFilter {
  domain?: string;
  verb?: string;
  sourceType?: string;
  projectId?: string;
  since?: string;
  limit?: number;
}

export interface EventFilter {
  channel?: string;
  sessionId?: string;
  since?: string;
  limit?: number;
}

export interface CommandRecord {
  id: string;
  channel: string;
  domain: string;
  verb: string;
  noun: string | null;
  isMutation: boolean;
  sourceType: string;
  sourceId: string | null;
  sourceName: string | null;
  input: unknown;
  output: unknown;
  status: string;
  error: string | null;
  durationMs: number | null;
  projectId: string | null;
  createdAt: string;
}

export interface EventRecord {
  id: string;
  channel: string;
  payload: unknown;
  sourceCommandId: string | null;
  sessionId: string | null;
  projectId: string | null;
  createdAt: string;
}

export type CommandHandler = (input: unknown) => Promise<unknown>;

export interface RegisteredCommand {
  channel: string;
  domain: string;
  verb: string;
  noun: string | null;
  isMutation: boolean;
  handler: CommandHandler;
}

// Verbs that represent mutations (not reads)
const MUTATION_VERBS = new Set([
  'create', 'update', 'delete', 'archive', 'add', 'remove', 'set',
  'save', 'send', 'start', 'stop', 'cancel', 'spawn', 'kill',
  'login', 'logout', 'register', 'refresh', 'restore', 'clear',
  'execute', 'launch', 'connect', 'disconnect', 'sync', 'import',
  'export', 'install', 'download', 'resolve', 'commit', 'push',
  'invoke', 'generate', 'report', 'dismiss', 'vote', 'toggle',
  'duplicate', 'write', 'apply', 'provision', 'teardown', 'handoff',
  'mark', 'retry', 'abort', 'setup', 'initialize', 'modify',
  'watch', 'log', 'reset', 'revoke', 'authorize', 'play', 'pause',
  'skip', 'resize', 'capture',
]);

// ── Session Types ───────────────────────────────────────────

export interface SessionSpawnRequest {
  name: string;
  type: 'project-owner' | 'team-lead' | 'assistant' | 'qa' | 'research' | 'planner';
  phase?: 'research' | 'planning' | 'executing' | 'qa';
  projectId?: string;
  projectPath?: string;
  taskSlug?: string;
  prompt: string;
  model?: string;
  parentId?: string;
  teamName?: string;
  wave?: number;
  taskIndex?: number;
  worktreePath?: string;
  agentFlags?: {
    agentId?: string;
    agentName?: string;
    agentType?: string;
    dangerouslySkipPermissions?: boolean;
  };
}

export interface SessionRecord {
  id: string;
  name: string;
  type: string;
  phase: string | null;
  status: string;
  projectId: string | null;
  taskSlug: string | null;
  model: string | null;
  pid: number | null;
  worktreePath: string | null;
  spawnConfig: unknown;
  tokenUsage: unknown;
  toolUsage: unknown;
  parentId: string | null;
  teamName: string | null;
  wave: number | null;
  taskIndex: number | null;
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
  error: string | null;
}

export interface SessionFilter {
  status?: string;
  type?: string;
  projectId?: string;
  taskSlug?: string;
  parentId?: string;
}

export type SessionEventType = 'spawned' | 'active' | 'completed' | 'error' | 'killed';
export type SessionEventHandler = (event: { type: SessionEventType; session: SessionRecord }) => void;

// ── Mutation Detection ──────────────────────────────────────

export function isMutationVerb(verb: string): boolean {
  return MUTATION_VERBS.has(verb);
}

export function parseChannel(channel: string): { domain: string; verb: string; noun: string | null } {
  const parts = channel.split('.');
  if (parts.length === 3) {
    return { domain: parts[0], verb: parts[1], noun: parts[2] };
  }
  if (parts.length === 2) {
    return { domain: parts[0], verb: parts[1], noun: null };
  }
  // Handle hyphenated domains like "agent-dashboard.spawn.owner"
  const lastDot = channel.lastIndexOf('.');
  const secondLastDot = channel.lastIndexOf('.', lastDot - 1);
  if (secondLastDot > 0) {
    return {
      domain: channel.slice(0, secondLastDot),
      verb: channel.slice(secondLastDot + 1, lastDot),
      noun: channel.slice(lastDot + 1),
    };
  }
  return { domain: channel.slice(0, lastDot), verb: channel.slice(lastDot + 1), noun: null };
}
