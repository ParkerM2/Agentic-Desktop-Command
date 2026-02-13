/**
 * DiscordPanel — Quick Discord actions and status display
 */

import { useNavigate } from '@tanstack/react-router';
import { MessageSquare, Phone, Server, Settings, UserCircle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useCommunicationsStore } from '../store';

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-success',
  disconnected: 'bg-muted-foreground',
  error: 'bg-destructive',
};

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const discordActions: QuickAction[] = [
  { label: 'Send Message', icon: MessageSquare, description: 'Send to a channel' },
  { label: 'Call User', icon: Phone, description: 'Start a voice/video call' },
  { label: 'List Servers', icon: Server, description: 'Browse your servers' },
  { label: 'Set Status', icon: UserCircle, description: 'Update your presence' },
];

export function DiscordPanel() {
  const { discordStatus } = useCommunicationsStore();
  const navigate = useNavigate();

  function handleAction(action: string): void {
    if (discordStatus !== 'connected') {
      void navigate({ to: '/settings' });
      return;
    }
    // TODO: Wire to MCP tool call
    console.warn(`[Discord] Action not yet wired: ${action}`);
  }

  function handleConnect(): void {
    void navigate({ to: '/settings' });
  }

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground text-sm font-semibold">Discord</h3>
          <span
            className={cn('inline-block h-2 w-2 rounded-full', STATUS_COLORS[discordStatus])}
          />
          <span className="text-muted-foreground text-xs capitalize">{discordStatus}</span>
        </div>
        {discordStatus === 'disconnected' ? (
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
        {discordActions.map((action) => (
          <button
            key={action.label}
            disabled={discordStatus === 'error'}
            type="button"
            className={cn(
              'border-border flex items-start gap-2 rounded-md border p-3 text-left',
              'hover:bg-accent transition-colors',
              'disabled:pointer-events-none disabled:opacity-40',
            )}
            onClick={() => {
              handleAction(action.label);
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
  );
}
