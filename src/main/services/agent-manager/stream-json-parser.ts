/**
 * Stream JSON Parser — Parses NDJSON from Claude headless stdout
 *
 * Handles incomplete lines via internal buffer, emits typed StreamJsonEvent
 * objects for each complete JSON line. Designed for the Project Owner
 * stream-json protocol (bidirectional NDJSON via stdin/stdout).
 */

import type {
  AgentChatMessage,
  ContentBlock,
  StreamJsonEvent,
  StreamJsonEventType,
} from '@shared/types/agent-dashboard';

/** Callback invoked for each parsed event */
export type StreamEventHandler = (event: StreamJsonEvent) => void;

/** Callback invoked for parsed chat messages */
export type ChatMessageHandler = (message: AgentChatMessage) => void;

/** Callback invoked when a parsing error occurs on a line */
export type ParseErrorHandler = (error: Error, rawLine: string) => void;

export interface StreamJsonParser {
  /** Feed raw data from stdout into the parser */
  feed: (chunk: Buffer | string) => void;
  /** Register handler for raw stream events */
  onEvent: (handler: StreamEventHandler) => () => void;
  /** Register handler for parsed chat messages */
  onMessage: (handler: ChatMessageHandler) => () => void;
  /** Register handler for parse errors */
  onError: (handler: ParseErrorHandler) => () => void;
  /** Reset internal buffer state */
  reset: () => void;
}

const VALID_EVENT_TYPES = new Set<string>(['system', 'assistant', 'stream_event', 'result']);

function isValidEventType(type: unknown): type is StreamJsonEventType {
  return typeof type === 'string' && VALID_EVENT_TYPES.has(type);
}

/**
 * Validate that a parsed JSON object looks like a StreamJsonEvent.
 * Returns true if the object has a valid `type` field.
 */
function isStreamJsonEvent(value: unknown): value is StreamJsonEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return isValidEventType(obj.type);
}

/**
 * Extract tool_use content blocks from an assistant message's content array.
 */
export function extractToolCalls(content: ContentBlock[]): ContentBlock[] {
  return content.filter((block) => block.type === 'tool_use');
}

/**
 * Create a StreamJsonParser instance for parsing NDJSON from Claude stdout.
 */
export function createStreamJsonParser(agentId: string): StreamJsonParser {
  let buffer = '';
  let messageCounter = 0;
  const eventHandlers = new Set<StreamEventHandler>();
  const messageHandlers = new Set<ChatMessageHandler>();
  const errorHandlers = new Set<ParseErrorHandler>();

  function emitEvent(event: StreamJsonEvent): void {
    for (const handler of eventHandlers) {
      handler(event);
    }
  }

  function emitMessage(message: AgentChatMessage): void {
    for (const handler of messageHandlers) {
      handler(message);
    }
  }

  function emitError(error: Error, rawLine: string): void {
    for (const handler of errorHandlers) {
      handler(error, rawLine);
    }
  }

  /**
   * Convert a StreamJsonEvent of type 'assistant' into an AgentChatMessage.
   */
  function toAgentChatMessage(event: StreamJsonEvent): AgentChatMessage | undefined {
    if (event.type !== 'assistant' || !event.message) {
      return;
    }

    messageCounter += 1;
    return {
      id: `${agentId}-msg-${String(messageCounter)}`,
      agentId,
      role: 'assistant',
      content: event.message.content,
      timestamp: new Date().toISOString(),
      isStreaming: false,
    };
  }

  function parseLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      emitError(new Error(`Malformed JSON line: ${trimmed.slice(0, 100)}`), trimmed);
      return;
    }

    if (!isStreamJsonEvent(parsed)) {
      emitError(new Error(`Invalid stream-json event: missing or invalid type field`), trimmed);
      return;
    }

    emitEvent(parsed);

    // Convert assistant messages to chat messages for the UI layer
    const chatMessage = toAgentChatMessage(parsed);
    if (chatMessage) {
      emitMessage(chatMessage);
    }
  }

  return {
    feed(chunk) {
      const data = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      buffer += data;

      // Process complete lines (NDJSON = one JSON object per line)
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        parseLine(line);
        newlineIndex = buffer.indexOf('\n');
      }
    },

    onEvent(handler) {
      eventHandlers.add(handler);
      return () => {
        eventHandlers.delete(handler);
      };
    },

    onMessage(handler) {
      messageHandlers.add(handler);
      return () => {
        messageHandlers.delete(handler);
      };
    },

    onError(handler) {
      errorHandlers.add(handler);
      return () => {
        errorHandlers.delete(handler);
      };
    },

    reset() {
      buffer = '';
      messageCounter = 0;
    },
  };
}
