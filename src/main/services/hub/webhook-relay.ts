/**
 * Webhook Relay — Hub WebSocket to Assistant Service
 *
 * Listens for webhook_command broadcast messages from the Hub WebSocket
 * and forwards them to the assistant service for processing.
 * Emits event:webhook.received so the renderer can show a notification.
 */

import type { WebhookCommand } from '@shared/types';

import type { IpcRouter } from '../../ipc/router';
import type { AssistantService } from '../assistant/assistant-service';

export interface WebhookRelay {
  handleHubMessage: (message: unknown) => void;
}

interface WebhookRelayDeps {
  assistantService: AssistantService;
  router: IpcRouter;
}

interface HubBroadcastMessage {
  type: string;
  entity: string;
  action: string;
  id: string;
  data: unknown;
  timestamp: string;
}

interface HubWebhookCommandData {
  source: string;
  command_text: string;
  source_id?: string;
  source_channel?: string;
  source_url?: string;
  project_id?: string;
}

function isHubBroadcast(message: unknown): message is HubBroadcastMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const msg = message as Record<string, unknown>;
  return (
    typeof msg.type === 'string' && typeof msg.entity === 'string' && typeof msg.action === 'string'
  );
}

function isWebhookCommandBroadcast(message: HubBroadcastMessage): boolean {
  return message.entity === 'webhook_command' && message.action === 'created';
}

function extractWebhookCommand(data: unknown): WebhookCommand | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const raw = data as HubWebhookCommandData;
  const { source } = raw;

  if (source !== 'slack' && source !== 'github') {
    return null;
  }

  const commandText = raw.command_text;
  if (typeof commandText !== 'string' || commandText.length === 0) {
    return null;
  }

  return {
    source,
    commandText,
    sourceContext: {
      channelName: typeof raw.source_channel === 'string' ? raw.source_channel : undefined,
      permalink: typeof raw.source_url === 'string' ? raw.source_url : undefined,
    },
  };
}

export function createWebhookRelay(deps: WebhookRelayDeps): WebhookRelay {
  const { assistantService, router } = deps;

  return {
    handleHubMessage(message: unknown): void {
      try {
        if (!isHubBroadcast(message)) {
          return;
        }

        if (!isWebhookCommandBroadcast(message)) {
          return;
        }

        const command = extractWebhookCommand(message.data);
        if (!command) {
          console.warn('[WebhookRelay] Could not extract command from broadcast data');
          return;
        }

        console.log(
          `[WebhookRelay] Received ${command.source} webhook: "${command.commandText.slice(0, 80)}"`,
        );

        // Emit event for renderer notification
        router.emit('event:webhook.received', {
          source: command.source,
          commandText: command.commandText,
          sourceContext: {
            channelName: command.sourceContext.channelName ?? '',
            permalink: command.sourceContext.permalink ?? '',
          },
          timestamp: new Date().toISOString(),
        });

        // Fire-and-forget: process the command via assistant service
        void assistantService.processWebhookCommand(command);
      } catch (error) {
        const message2 = error instanceof Error ? error.message : 'Unknown error';
        console.error('[WebhookRelay] Error handling hub message:', message2);
      }
    },
  };
}
