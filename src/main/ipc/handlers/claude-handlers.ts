/**
 * Claude SDK IPC handlers
 *
 * Registers handlers for Claude SDK operations including
 * conversation management and message sending.
 */

import { CLAUDE } from '@shared/ipc/claude/channels';

import type { ClaudeClient } from '../../services/claude';
import type { IpcRouter } from '../router';

export function registerClaudeHandlers(router: IpcRouter, claudeClient: ClaudeClient): void {
  // Check if Claude is configured
  router.handle(CLAUDE.CHECK.CONFIGURED, () =>
    Promise.resolve({ configured: claudeClient.isConfigured() }),
  );

  // Create a new conversation
  router.handle(CLAUDE.CREATE.CONVERSATION, ({ title }) =>
    Promise.resolve({ conversationId: claudeClient.createConversation(title) }),
  );

  // List all conversations
  router.handle(CLAUDE.LIST.CONVERSATIONS, () =>
    Promise.resolve(claudeClient.listConversations()),
  );

  // Get messages from a conversation
  router.handle(CLAUDE.GET.MESSAGES, ({ conversationId }) =>
    Promise.resolve(claudeClient.getMessages(conversationId)),
  );

  // Clear a conversation's history
  router.handle(CLAUDE.CLEAR.CONVERSATION, ({ conversationId }) => {
    claudeClient.clearConversation(conversationId);
    return Promise.resolve({ success: true });
  });

  // Send a message (non-streaming)
  router.handle(
    CLAUDE.SEND.MESSAGE,
    async ({ conversationId, message, model, maxTokens, systemPrompt }) => {
      return await claudeClient.sendMessage(conversationId, message, {
        model,
        maxTokens,
        systemPrompt,
      });
    },
  );

  // Send a message with streaming (emits events via router)
  router.handle(
    CLAUDE.STREAM.MESSAGE,
    async ({ conversationId, message, model, maxTokens, systemPrompt }) => {
      await claudeClient.streamMessage(conversationId, message, {
        model,
        maxTokens,
        systemPrompt,
      });
      return { success: true };
    },
  );
}
