/**
 * UserMessage — Right-aligned chat bubble for user messages (iMessage style)
 *
 * Grows from the right side, width adjusts to content up to 80% of container.
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
    <div className={cn('flex justify-end', className)}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5',
          'bg-primary text-primary-foreground',
        )}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className="mt-1 text-right text-[10px] text-primary-foreground/50">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
