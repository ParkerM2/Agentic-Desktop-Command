/**
 * UserMessage — Renders a user-submitted message
 *
 * Displayed with a distinct visual style to differentiate from assistant messages.
 */

import type { AgentTextMessage } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

// ─── Props ─────────────────────────────────────────────────

interface UserMessageProps {
  message: AgentTextMessage;
  className?: string;
}

// ─── Component ─────────────────────────────────────────────

export function UserMessage({ message, className }: UserMessageProps) {
  return (
    <div
      className={cn(
        'rounded-lg px-4 py-3',
        'bg-primary/10 text-foreground',
        className,
      )}
    >
      <div className="text-sm whitespace-pre-wrap break-words">
        {message.content}
      </div>
      <div className="mt-1 text-right text-xs text-muted-foreground">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
