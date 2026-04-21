/**
 * SlackActionModal — Modal for Slack action input
 */

import type { ChangeEvent } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { Button, Input, Label, Textarea } from '@ui';

import { useSlackActionModal } from './useSlackActionModal';

import type { SlackActionType } from './useSlackActionModal';


export type { SlackActionType };

interface SlackActionModalProps {
  actionType: SlackActionType | null;
  onClose: () => void;
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
  const { form, result, error, mcpCall, handleInputChange, handleSubmit } =
    useSlackActionModal(actionType);

  function renderForm(): React.ReactNode {
    if (!actionType) return null;

    switch (actionType) {
      case 'send_message':
        return (
          <>
            <div>
              <Label htmlFor="slack-channel">Channel</Label>
              <Input
                className="mt-1"
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
              <Label htmlFor="slack-text">Message</Label>
              <Textarea
                className="mt-1"
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
            <Label htmlFor="slack-channel">Channel</Label>
            <Input
              className="mt-1"
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
            <Label htmlFor="slack-query">Search Query</Label>
            <Input
              className="mt-1"
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
              <Label htmlFor="slack-status-text">Status Text</Label>
              <Input
                className="mt-1"
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
              <Label htmlFor="slack-status-emoji">Status Emoji</Label>
              <Input
                className="mt-1"
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
          className="bg-background border-border fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 max-h-[80vh] overflow-y-auto rounded-lg border shadow-2xl"
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
              <Button
                aria-label="Close"
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
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
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              disabled={mcpCall.isPending}
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
            >
              {mcpCall.isPending ? 'Processing...' : 'Execute'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
