/**
 * buildChatItems — Transforms raw AgentChatMessage[] into AgentChatItem[]
 *
 * Walks each message's ContentBlock[] array and produces:
 *   - `text`     items from TextBlock content (concatenated per message)
 *   - `tool`     items from ToolUseBlock content (one card per tool call)
 *   - `activity` items from ToolResultBlock content (compact one-liners)
 *
 * The output is the flat list that AgentChatPanel renders.
 */

import type {
  AgentActivityItem,
  AgentChatItem,
  AgentChatMessage,
  AgentTextMessage,
  AgentToolCall,
  ToolCallData,
  ToolCallType,
  ToolUseBlock,
} from '@shared/types/agent-dashboard';

// ── Helpers ───────────────────────────────────────────────────

let activitySeq = 0;

function nextActivityId(): string {
  activitySeq += 1;
  return `activity-${String(activitySeq)}`;
}

/** Map well-known tool names to ToolCallType discriminator */
const TOOL_TYPE_MAP: Record<string, ToolCallType> = {
  Read: 'Read',
  Edit: 'Edit',
  Write: 'Write',
  Bash: 'Bash',
  Task: 'AgentSpawn',
  Agent: 'AgentSpawn',
};

function toToolCallType(name: string): ToolCallType {
  return TOOL_TYPE_MAP[name] ?? 'Bash';
}

/** Safely extract a string from an unknown input field, with fallback key */
function extractString(input: Record<string, unknown>, key: string, fallbackKey?: string): string {
  const val = input[key];
  if (typeof val === 'string') return val;
  if (fallbackKey !== undefined) {
    const fb = input[fallbackKey];
    if (typeof fb === 'string') return fb;
  }
  return '';
}

/** Build Read tool call data */
function buildReadData(input: Record<string, unknown>): ToolCallData {
  return {
    type: 'Read',
    filePath: extractString(input, 'file_path', 'path'),
    lineRange: typeof input.line_range === 'string' ? input.line_range : undefined,
  };
}

/** Build Edit tool call data */
function buildEditData(input: Record<string, unknown>): ToolCallData {
  return {
    type: 'Edit',
    filePath: extractString(input, 'file_path', 'path'),
    additions: typeof input.additions === 'number' ? input.additions : 0,
    deletions: typeof input.deletions === 'number' ? input.deletions : 0,
    diffPreview: typeof input.diff === 'string' ? input.diff : undefined,
  };
}

/** Build Write tool call data */
function buildWriteData(input: Record<string, unknown>): ToolCallData {
  return {
    type: 'Write',
    filePath: extractString(input, 'file_path', 'path'),
    isNew: input.is_new === true,
  };
}

/** Build Bash tool call data */
function buildBashData(input: Record<string, unknown>): ToolCallData {
  return {
    type: 'Bash',
    command: extractString(input, 'command', 'cmd'),
  };
}

/** Build AgentSpawn tool call data */
function buildAgentSpawnData(input: Record<string, unknown>, blockId: string): ToolCallData {
  const taskStr = extractString(input, 'task', 'prompt');
  return {
    type: 'AgentSpawn',
    agentName: typeof input.name === 'string' ? input.name : 'Agent',
    task: taskStr,
    model: typeof input.model === 'string' ? input.model : 'unknown',
    status: 'running',
    agentId: typeof input.agent_id === 'string' ? input.agent_id : blockId,
  };
}

/** Build a typed ToolCallData from a ToolUseBlock */
function buildToolCallData(block: ToolUseBlock): ToolCallData {
  const type = toToolCallType(block.name);
  const { input } = block;

  switch (type) {
    case 'Read':
      return buildReadData(input);
    case 'Edit':
      return buildEditData(input);
    case 'Write':
      return buildWriteData(input);
    case 'Bash':
      return buildBashData(input);
    case 'AgentSpawn':
      return buildAgentSpawnData(input, block.id);
  }
}

/** Summarise a tool call as a one-liner for activity display */
function summariseTool(block: ToolUseBlock): string {
  const { input } = block;
  if (typeof input.file_path === 'string') return input.file_path;
  if (typeof input.path === 'string') return input.path;
  if (typeof input.command === 'string') return input.command.slice(0, 80);
  return '';
}

// ── Builder ──────────────────────────────────────────────────

/**
 * Convert raw IPC messages into renderable chat items.
 *
 * @param messages - Raw chat messages from the agent session cache
 * @param showActivity - When true, emit compact activity items for tool uses
 *                       instead of full tool call cards (default: false)
 */
export function buildChatItems(
  messages: AgentChatMessage[],
  showActivity = false,
): AgentChatItem[] {
  const items: AgentChatItem[] = [];

  for (const msg of messages) {
    const textParts: string[] = [];
    const toolBlocks: ToolUseBlock[] = [];

    for (const block of msg.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        toolBlocks.push(block);
      }
    }

    // Emit text item if there's any text content
    if (textParts.length > 0) {
      const text = textParts.join('\n');
      if (text.trim().length > 0) {
        const textMessage: AgentTextMessage = {
          id: msg.id,
          role: msg.role,
          content: text,
          timestamp: msg.timestamp,
          isStreaming: msg.isStreaming,
        };
        items.push({ kind: 'text', message: textMessage });
      }
    }

    // Emit tool items — either full cards or compact activity lines
    for (const block of toolBlocks) {
      if (showActivity) {
        const activity: AgentActivityItem = {
          id: nextActivityId(),
          toolName: block.name,
          summary: summariseTool(block),
          timestamp: msg.timestamp,
        };
        items.push({ kind: 'activity', activity });
      } else {
        const toolCall: AgentToolCall = {
          id: block.id,
          toolCall: buildToolCallData(block),
          isError: false,
          timestamp: msg.timestamp,
        };
        items.push({ kind: 'tool', toolCall });
      }
    }
  }

  return items;
}
