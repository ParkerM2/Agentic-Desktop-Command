/**
 * SlackActionModal — Modal for Slack action input
 */

import type { ChangeEvent } from 'react';
import { useState } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useMcpToolCall } from '../api/useMcpTool';

export type SlackActionType = 'send_message' | 'read_channel' | 'search' | 'set_status';

interface SlackActionModalProps {
  actionType: SlackActionType | null;
  onClose: () => void;
}

interface FormState {
  channel: string;
  text: string;
  query: string;
  statusText: string;
  statusEmoji: string;
}

const ACTION_LABELS: Record<SlackActionType, string> = {
  send_message: 'Send Message',
  read_channel: 'Read Channel',
  search: 'Search Workspace',
  set_status: 'Set Status',
};

const ACTION_DESCRIPTIONS: Record<SlackActionType, string> = {
  send_message: 'Send a message to a Slack channel or DM',
  read_channel: 'View recent messages from a channel',
  search: 'Search messages across your workspace',
  set_status: 'Update your Slack status',
};

export function SlackActionModal({ actionType, onClose }: SlackActionModalProps) {
  const [form, setForm] = useState<FormState>({
    channel: '',
    text: '',
    query: '',
    statusText: '',
    statusEmoji: ':house:',
  });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mcpCall = useMcpToolCall();

  function handleInputChange(
    field: keyof FormState,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
          toolName = 'slack_send_message';
          args = { channel: form.channel, text: form.text };
          break;
        case 'read_channel':
          toolName = 'slack_read_channel';
          args = { channel: form.channel, limit: 20 };
          break;
        case 'search':
          toolName = 'slack_search';
          args = { query: form.query, count: 20 };
          break;
        case 'set_status':
          toolName = 'slack_set_status';
          args = { text: form.statusText, emoji: form.statusEmoji };
          break;
        default:
          return;
      }

      const response = await mcpCall.mutateAsync({
        server: 'slack',
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
              <label className="text-sm font-medium" htmlFor="slack-channel">
                Channel
              </label>
              <input
                className={inputClass}
                id="slack-channel"
                placeholder="#general or C1234567890"
                type="text"
                value={form.channel}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  handleInputChange('channel', e);
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="slack-text">
                Message
              </label>
              <textarea
                className={inputClass}
                id="slack-text"
                placeholder="Your message..."
                rows={3}
                value={form.text}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  handleInputChange('text', e);
                }}
              />
            </div>
          </>
        );

      case 'read_channel':
        return (
          <div>
            <label className="text-sm font-medium" htmlFor="slack-channel">
              Channel
            </label>
            <input
              className={inputClass}
              id="slack-channel"
              placeholder="#general or C1234567890"
              type="text"
              value={form.channel}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleInputChange('channel', e);
              }}
            />
          </div>
        );

      case 'search':
        return (
          <div>
            <label className="text-sm font-medium" htmlFor="slack-query">
              Search Query
            </label>
            <input
              className={inputClass}
              id="slack-query"
              placeholder="Search for messages..."
              type="text"
              value={form.query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleInputChange('query', e);
              }}
            />
          </div>
        );

      case 'set_status':
        return (
          <>
            <div>
              <label className="text-sm font-medium" htmlFor="slack-status-text">
                Status Text
              </label>
              <input
                className={inputClass}
                id="slack-status-text"
                placeholder="Working from home"
                type="text"
                value={form.statusText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  handleInputChange('statusText', e);
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="slack-status-emoji">
                Status Emoji
              </label>
              <input
                className={inputClass}
                id="slack-status-emoji"
                placeholder=":house:"
                type="text"
                value={form.statusEmoji}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  handleInputChange('statusEmoji', e);
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
