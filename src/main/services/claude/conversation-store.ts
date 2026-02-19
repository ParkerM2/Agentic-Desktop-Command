/**
 * Conversation Store — In-memory conversation history management
 *
 * Stores conversation history per session. Supports multiple concurrent
 * conversations and prunes old messages when context limits are approached.
 */

import { randomUUID } from 'node:crypto';

import type { ClaudeConversation, ClaudeMessage } from '@shared/types';

import { fsLogger } from '@main/lib/logger';

/** Internal conversation state including full message history. */
interface ConversationState {
  id: string;
  title: string;
  messages: ClaudeMessage[];
  createdAt: string;
  updatedAt: string;
}

/** Configuration for the conversation store. */
export interface ConversationStoreConfig {
  /** Max messages per conversation before pruning (default: 100). */
  maxMessagesPerConversation?: number;
  /** Max conversations to keep (default: 50). */
  maxConversations?: number;
  /** Approximate token limit before context pruning (default: 150000). */
  contextTokenLimit?: number;
}

/** Interface for the conversation store. */
export interface ConversationStore {
  /** Create a new conversation. Returns the conversation ID. */
  createConversation: (title?: string) => string;
  /** Get a conversation by ID. Returns null if not found. */
  getConversation: (id: string) => ConversationState | null;
  /** List all conversations (without full message history). */
  listConversations: () => ClaudeConversation[];
  /** Add a message to a conversation. */
  addMessage: (conversationId: string, message: ClaudeMessage) => void;
  /** Get all messages for a conversation. */
  getMessages: (conversationId: string) => ClaudeMessage[];
  /** Clear a conversation's message history. */
  clearConversation: (conversationId: string) => void;
  /** Delete a conversation entirely. */
  deleteConversation: (conversationId: string) => void;
  /** Prune old messages if context limit is approached. Returns pruned count. */
  pruneIfNeeded: (conversationId: string) => number;
  /** Estimate token count for a conversation. */
  estimateTokenCount: (conversationId: string) => number;
}

/**
 * Rough token estimation: ~4 characters per token for English text.
 * This is a conservative estimate for pruning decisions.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create a conversation store instance.
 */
export function createConversationStore(config?: ConversationStoreConfig): ConversationStore {
  const maxMessagesPerConversation = config?.maxMessagesPerConversation ?? 100;
  const maxConversations = config?.maxConversations ?? 50;
  const contextTokenLimit = config?.contextTokenLimit ?? 150000;

  const conversations = new Map<string, ConversationState>();

  function generateTitle(): string {
    const now = new Date();
    return `Conversation ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  }

  function enforceMaxConversations(): void {
    if (conversations.size <= maxConversations) {
      return;
    }

    // Sort by updatedAt ascending (oldest first) and remove excess
    const sorted = [...conversations.entries()].sort(
      ([, a], [, b]) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

    const toRemove = sorted.slice(0, sorted.length - maxConversations);
    for (const [id] of toRemove) {
      conversations.delete(id);
    }
  }

  return {
    createConversation(title) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const conversation: ConversationState = {
        id,
        title: title ?? generateTitle(),
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      conversations.set(id, conversation);
      enforceMaxConversations();
      return id;
    },

    getConversation(id) {
      return conversations.get(id) ?? null;
    },

    listConversations() {
      const list: ClaudeConversation[] = [];
      for (const conv of conversations.values()) {
        list.push({
          id: conv.id,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messageCount: conv.messages.length,
        });
      }
      // Sort by updatedAt descending (newest first)
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return list;
    },

    addMessage(conversationId, message) {
      const conv = conversations.get(conversationId);
      if (!conv) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }
      conv.messages.push(message);
      conv.updatedAt = new Date().toISOString();

      // Enforce max messages per conversation
      if (conv.messages.length > maxMessagesPerConversation) {
        // Keep system message if present, then prune oldest
        const pruneCount = conv.messages.length - maxMessagesPerConversation;
        conv.messages = conv.messages.slice(pruneCount);
      }
    },

    getMessages(conversationId) {
      const conv = conversations.get(conversationId);
      if (!conv) {
        return [];
      }
      return [...conv.messages];
    },

    clearConversation(conversationId) {
      const conv = conversations.get(conversationId);
      if (conv) {
        conv.messages = [];
        conv.updatedAt = new Date().toISOString();
      }
    },

    deleteConversation(conversationId) {
      conversations.delete(conversationId);
    },

    pruneIfNeeded(conversationId) {
      const conv = conversations.get(conversationId);
      if (!conv) {
        return 0;
      }

      let totalTokens = 0;
      for (const msg of conv.messages) {
        totalTokens += estimateTokens(msg.content);
      }

      if (totalTokens <= contextTokenLimit) {
        return 0;
      }

      // Prune oldest messages until under limit
      // Keep at least the last 2 messages (user + assistant pair)
      let prunedCount = 0;
      while (totalTokens > contextTokenLimit && conv.messages.length > 2) {
        const removed = conv.messages.shift();
        if (removed) {
          totalTokens -= estimateTokens(removed.content);
          prunedCount++;
        }
      }

      if (prunedCount > 0) {
        conv.updatedAt = new Date().toISOString();
        fsLogger.info(
          `[ConversationStore] Pruned ${String(prunedCount)} messages from ${conversationId}`,
        );
      }

      return prunedCount;
    },

    estimateTokenCount(conversationId) {
      const conv = conversations.get(conversationId);
      if (!conv) {
        return 0;
      }

      let total = 0;
      for (const msg of conv.messages) {
        total += estimateTokens(msg.content);
      }
      return total;
    },
  };
}
