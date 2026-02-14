/**
 * DiscordActionModal — Modal for Discord action input
 */

import type { ChangeEvent } from 'react';
import { useState } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useMcpToolCall } from '../api/useMcpTool';

export type DiscordActionType = 'send_message' | 'call_user' | 'list_servers' | 'set_status';

interface DiscordActionModalProps {
  actionType: DiscordActionType | null;
  onClose: () => void;
}

interface FormState {
  channelId: string;
  content: string;
  userId: string;
  status: 'online' | 'dnd' | 'idle' | 'invisible';
  activityName: string;
}

const ACTION_LABELS: Record<DiscordActionType, string> = {
  send_message: 'Send Message',
  call_user: 'Call User',
  list_servers: 'List Servers',
  set_status: 'Set Status',
};

const ACTION_DESCRIPTIONS: Record<DiscordActionType, string> = {
  send_message: 'Send a message to a Discord channel',
  call_user: 'Start a voice/video call with a user',
  list_servers: 'Browse servers you are a member of',
  set_status: 'Update your Discord presence',
};

export function DiscordActionModal({ actionType, onClose }: DiscordActionModalProps) {
  const [form, setForm] = useState<FormState>({
    channelId: '',
    content: '',
    userId: '',
    status: 'online',
    activityName: '',
  });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mcpCall = useMcpToolCall();

  function handleInputChange(
    field: keyof FormState,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setResult(null);
  }

  async function handleSubmit(): Promise<void> {
    if (!actionType) return;

    setError(null);
    setResult(null);

    try {
      let toolName: string;
      let args: Record<string, unknown>;

      switch (actionType) {
        case 'send_message':
          toolName = 'discord_send_message';
          args = { channelId: form.channelId, content: form.content };
          break;
        case 'call_user':
          toolName = 'discord_call_user';
          args = { userId: form.userId };
          break;
        case 'list_servers':
          toolName = 'discord_list_servers';
          args = {};
          break;
        case 'set_status':
          toolName = 'discord_set_status';
          args = {
            status: form.status,
            activityName: form.activityName.length > 0 ? form.activityName : undefined,
          };
          break;
        default:
          return;
      }

      const response = await mcpCall.mutateAsync({
        server: 'discord',
        tool: toolName,
        args,
      });

      if (response.isError) {
        const errorText = response.content[0]?.text ?? 'Unknown error';
        setError(errorText);
      } else {
        const resultText = response.content[0]?.text ?? 'Success';
        setResult(resultText);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }

  function renderForm(): React.ReactNode {
    if (!actionType) return null;

    const inputClass = cn(
      'border-border bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm',
      'focus:border-primary focus:ring-ring focus:ring-1 focus:outline-none',
      'placeholder:text-muted-foreground',
    );

    switch (actionType) {
      case 'send_message':
        return (
          <>
            <div>
              <label className="text-sm font-medium" htmlFor="discord-channel">
                Channel ID
              </label>
              <input
                className={inputClass}
                id="discord-channel"
                placeholder="1234567890123456789"
                type="text"
                value={form.channelId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  handleInputChange('channelId', e);
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="discord-content">
                Message
              </label>
              <textarea
                className={inputClass}
                id="discord-content"
                placeholder="Your message..."
                rows={3}
                value={form.content}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  handleInputChange('content', e);
                }}
              />
            </div>
          </>
        );

      case 'call_user':
        return (
          <div>
            <label className="text-sm font-medium" htmlFor="discord-user">
              User ID
            </label>
            <input
              className={inputClass}
              id="discord-user"
              placeholder="1234567890123456789"
              type="text"
              value={form.userId}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleInputChange('userId', e);
              }}
            />
          </div>
        );

      case 'list_servers':
        return (
          <p className="text-muted-foreground text-sm">
            Click Execute to list all servers you are a member of.
          </p>
        );

      case 'set_status':
        return (
          <>
            <div>
              <label className="text-sm font-medium" htmlFor="discord-status">
                Status
              </label>
              <select
                className={inputClass}
                id="discord-status"
                value={form.status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  handleInputChange('status', e);
                }}
              >
                <option value="online">Online</option>
                <option value="dnd">Do Not Disturb</option>
                <option value="idle">Idle</option>
                <option value="invisible">Invisible</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="discord-activity">
                Activity Name (optional)
              </label>
              <input
                className={inputClass}
                id="discord-activity"
                placeholder="Playing a game..."
                type="text"
                value={form.activityName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  handleInputChange('activityName', e);
                }}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  }

  return (
    <Dialog.Root open={actionType !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'bg-background border-border fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'max-h-[80vh] overflow-y-auto rounded-lg border shadow-2xl',
          )}
        >
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {actionType ? ACTION_LABELS[actionType] : ''}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {actionType ? ACTION_DESCRIPTIONS[actionType] : ''}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <div className="space-y-4 p-4">{renderForm()}</div>

          {/* Error */}
          {error ? (
            <div className="bg-destructive/10 text-destructive mx-4 rounded-md p-3 text-sm">
              {error}
            </div>
          ) : null}

          {/* Result */}
          {result ? (
            <div className="bg-muted mx-4 max-h-40 overflow-y-auto rounded-md p-3">
              <pre className="text-muted-foreground text-xs whitespace-pre-wrap">{result}</pre>
            </div>
          ) : null}

          {/* Actions */}
          <div className="border-border flex justify-end gap-2 border-t p-4">
            <button
              type="button"
              className={cn(
                'border-border text-muted-foreground rounded-md border px-4 py-2 text-sm',
                'hover:bg-accent hover:text-foreground',
              )}
              onClick={onClose}
            >
              Close
            </button>
            <button
              disabled={mcpCall.isPending}
              type="button"
              className={cn(
                'bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium',
                'hover:bg-primary/90 disabled:opacity-50',
              )}
              onClick={() => {
                void handleSubmit();
              }}
            >
              {mcpCall.isPending ? 'Processing...' : 'Execute'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
