/**
 * SlackPanel — Quick Slack actions and status display
 */

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { Hash, MessageSquare, Search, Settings, UserCircle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useCommunicationsStore } from '../store';

import { SlackActionModal } from './SlackActionModal';

import type { SlackActionType } from './SlackActionModal';

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-success',
  disconnected: 'bg-muted-foreground',
  error: 'bg-destructive',
};

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  actionType: SlackActionType;
}

const slackActions: QuickAction[] = [
  {
    label: 'Send Message',
    icon: MessageSquare,
    description: 'Send to a channel or DM',
    actionType: 'send_message',
  },
  {
    label: 'Read Channel',
    icon: Hash,
    description: 'View recent messages',
    actionType: 'read_channel',
  },
  {
    label: 'Search',
    icon: Search,
    description: 'Search workspace messages',
    actionType: 'search',
  },
  {
    label: 'Set Status',
    icon: UserCircle,
    description: 'Update your Slack status',
    actionType: 'set_status',
  },
];

export function SlackPanel() {
  const { slackStatus } = useCommunicationsStore();
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<SlackActionType | null>(null);

  function handleAction(actionType: SlackActionType): void {
    if (slackStatus !== 'connected') {
      void navigate({ to: '/settings' });
      return;
    }
    setActiveAction(actionType);
  }

  function handleConnect(): void {
    void navigate({ to: '/settings' });
  }

  function handleCloseModal(): void {
    setActiveAction(null);
  }

  return (
    <>
      <div className="bg-card border-border rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-foreground text-sm font-semibold">Slack</h3>
            <span className={cn('inline-block h-2 w-2 rounded-full', STATUS_COLORS[slackStatus])} />
            <span className="text-muted-foreground text-xs capitalize">{slackStatus}</span>
          </div>
          {slackStatus === 'disconnected' ? (
            <button
              className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium transition-colors"
              type="button"
              onClick={handleConnect}
            >
              <Settings className="h-3 w-3" />
              Connect
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {slackActions.map((action) => (
            <button
              key={action.label}
              disabled={slackStatus === 'error'}
              type="button"
              className={cn(
                'border-border flex items-start gap-2 rounded-md border p-3 text-left',
                'hover:bg-accent transition-colors',
                'disabled:pointer-events-none disabled:opacity-40',
              )}
              onClick={() => {
                handleAction(action.actionType);
              }}
            >
              <action.icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-foreground text-xs font-medium">{action.label}</p>
                <p className="text-muted-foreground text-xs">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <SlackActionModal actionType={activeAction} onClose={handleCloseModal} />
    </>
  );
}
