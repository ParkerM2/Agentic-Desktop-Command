/**
 * Claude Client — Anthropic SDK wrapper
 *
 * Provides a persistent Claude client that manages conversations,
 * supports streaming responses, and handles API key configuration.
 */

import Anthropic from '@anthropic-ai/sdk';

import type {
  ClaudeClientConfig,
  ClaudeConversation,
  ClaudeError,
  ClaudeMessage,
  ClaudeSendMessageResponse,
  ClaudeStreamChunk,
  ClaudeTokenUsage,
} from '@shared/types';

import { createConversationStore } from './conversation-store';

import type { ConversationStore } from './conversation-store';
import type { IpcRouter } from '../../ipc/router';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const STREAM_CHUNK_EVENT = 'event:claude.streamChunk' as const;

/** Claude client interface. */
export interface ClaudeClient {
  /** Check if the client is configured with an API key. */
  isConfigured: () => boolean;
  /** Update the API key configuration. */
  configure: (config: ClaudeClientConfig) => void;
  /** Create a new conversation. */
  createConversation: (title?: string) => string;
  /** List all conversations. */
  listConversations: () => ClaudeConversation[];
  /** Clear a conversation's history. */
  clearConversation: (conversationId: string) => void;
  /** Get messages from a conversation. */
  getMessages: (conversationId: string) => ClaudeMessage[];
  /** Send a message and get a response (non-streaming). */
  sendMessage: (
    conversationId: string,
    message: string,
    options?: { model?: string; maxTokens?: number; systemPrompt?: string },
  ) => Promise<ClaudeSendMessageResponse>;
  /** Send a message with streaming response (emits events via router). */
  streamMessage: (
    conversationId: string,
    message: string,
    options?: { model?: string; maxTokens?: number; systemPrompt?: string },
  ) => Promise<void>;
}

/** Dependencies for the Claude client. */
export interface ClaudeClientDeps {
  router: IpcRouter;
  getApiKey: () => string | undefined;
}

/**
 * Map Anthropic API errors to structured ClaudeError.
 */
function mapApiError(error: unknown): ClaudeError {
  if (error instanceof Anthropic.AuthenticationError) {
    return {
      code: 'invalid_api_key',
      message: 'Invalid API key. Please check your Anthropic API key in settings.',
    };
  }

  if (error instanceof Anthropic.RateLimitError) {
    // Extract retry-after header if present
    const errorWithHeaders = error as unknown as { headers?: { 'retry-after'?: string } };
    const retryAfter = errorWithHeaders.headers?.['retry-after'];
    return {
      code: 'rate_limited',
      message: 'Rate limited by Anthropic API. Please wait before trying again.',
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
    };
  }

  if (error instanceof Anthropic.BadRequestError) {
    const message = error.message.toLowerCase();
    if (message.includes('context') || message.includes('token')) {
      return {
        code: 'context_length_exceeded',
        message: 'Conversation is too long. Please start a new conversation or clear history.',
      };
    }
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  return {
    code: 'unknown_error',
    message: errorMessage,
  };
}

/**
 * Create a Claude client instance.
 */
export function createClaudeClient(deps: ClaudeClientDeps): ClaudeClient {
  const { router, getApiKey } = deps;

  let config: ClaudeClientConfig | null = null;
  let anthropicClient: Anthropic | null = null;
  const conversationStore: ConversationStore = createConversationStore();

  function ensureClient(): Anthropic {
    const apiKey = config?.apiKey ?? getApiKey();
    if (!apiKey) {
      throw Object.assign(new Error('Claude API is not configured'), {
        claudeError: {
          code: 'not_configured',
          message: 'Anthropic API key is not configured. Please add your API key in settings.',
        } as ClaudeError,
      });
    }

    // Create or update client if API key changed
    if (!anthropicClient || (config && config.apiKey !== apiKey)) {
      anthropicClient = new Anthropic({ apiKey });
      if (config) {
        config.apiKey = apiKey;
      } else {
        config = { apiKey };
      }
    }

    return anthropicClient;
  }

  function getModel(): string {
    return config?.defaultModel ?? DEFAULT_MODEL;
  }

  function getMaxTokens(): number {
    return config?.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;
  }

  function buildMessages(
    conversationId: string,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages = conversationStore.getMessages(conversationId);
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  return {
    isConfigured() {
      const apiKey = config?.apiKey ?? getApiKey();
      return apiKey !== undefined && apiKey.length > 0;
    },

    configure(newConfig) {
      config = { ...newConfig };
      anthropicClient = null; // Reset client to use new config
    },

    createConversation(title) {
      return conversationStore.createConversation(title);
    },

    listConversations() {
      return conversationStore.listConversations();
    },

    clearConversation(conversationId) {
      conversationStore.clearConversation(conversationId);
    },

    getMessages(conversationId) {
      return conversationStore.getMessages(conversationId);
    },

    async sendMessage(conversationId, message, options) {
      const client = ensureClient();

      // Ensure conversation exists
      const conv = conversationStore.getConversation(conversationId);
      if (!conv) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      // Add user message to history
      conversationStore.addMessage(conversationId, { role: 'user', content: message });

      // Prune if context is too long
      conversationStore.pruneIfNeeded(conversationId);

      const model = options?.model ?? getModel();
      const maxTokens = options?.maxTokens ?? getMaxTokens();

      try {
        const response = await client.messages.create({
          model,
          max_tokens: maxTokens,
          system: options?.systemPrompt,
          messages: buildMessages(conversationId),
        });

        // Extract text content
        let responseText = '';
        for (const block of response.content) {
          if (block.type === 'text') {
            responseText += block.text;
          }
        }

        // Add assistant response to history
        conversationStore.addMessage(conversationId, { role: 'assistant', content: responseText });

        const usage: ClaudeTokenUsage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };

        return {
          conversationId,
          message: responseText,
          usage,
        };
      } catch (error) {
        // Remove the user message if request failed
        const messages = conversationStore.getMessages(conversationId);
        if (messages.length > 0 && messages.at(-1)?.role === 'user') {
          // Pop the last message by clearing and re-adding all but the last
          conversationStore.clearConversation(conversationId);
          for (const msg of messages.slice(0, -1)) {
            conversationStore.addMessage(conversationId, msg);
          }
        }

        const claudeError = mapApiError(error);
        throw Object.assign(new Error(claudeError.message), { claudeError });
      }
    },

    async streamMessage(conversationId, message, options) {
      const client = ensureClient();

      // Ensure conversation exists
      const conv = conversationStore.getConversation(conversationId);
      if (!conv) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      // Add user message to history
      conversationStore.addMessage(conversationId, { role: 'user', content: message });

      // Prune if context is too long
      conversationStore.pruneIfNeeded(conversationId);

      const model = options?.model ?? getModel();
      const maxTokens = options?.maxTokens ?? getMaxTokens();

      try {
        // Emit message start
        const startChunk: ClaudeStreamChunk = {
          conversationId,
          type: 'message_start',
        };
        router.emit(STREAM_CHUNK_EVENT, startChunk);

        const stream = client.messages.stream({
          model,
          max_tokens: maxTokens,
          system: options?.systemPrompt,
          messages: buildMessages(conversationId),
        });

        let fullResponse = '';

        stream.on('text', (text) => {
          fullResponse += text;
          const chunk: ClaudeStreamChunk = {
            conversationId,
            type: 'content_delta',
            content: text,
          };
          router.emit(STREAM_CHUNK_EVENT, chunk);
        });

        // Wait for stream to complete
        const finalMessage = await stream.finalMessage();

        // Add assistant response to history
        conversationStore.addMessage(conversationId, { role: 'assistant', content: fullResponse });

        // Emit message stop with usage
        const stopChunk: ClaudeStreamChunk = {
          conversationId,
          type: 'message_stop',
          usage: {
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
          },
        };
        router.emit(STREAM_CHUNK_EVENT, stopChunk);
      } catch (error) {
        // Remove the user message if request failed
        const messages = conversationStore.getMessages(conversationId);
        if (messages.length > 0 && messages.at(-1)?.role === 'user') {
          conversationStore.clearConversation(conversationId);
          for (const msg of messages.slice(0, -1)) {
            conversationStore.addMessage(conversationId, msg);
          }
        }

        const claudeError = mapApiError(error);

        // Emit error chunk
        const errorChunk: ClaudeStreamChunk = {
          conversationId,
          type: 'error',
          error: claudeError.message,
        };
        router.emit(STREAM_CHUNK_EVENT, errorChunk);

        throw Object.assign(new Error(claudeError.message), { claudeError });
      }
    },
  };
}
