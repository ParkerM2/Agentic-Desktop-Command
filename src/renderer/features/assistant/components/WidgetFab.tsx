/**
 * WidgetFab — Floating action button for the assistant widget
 *
 * Bottom-right circle that morphs between MessageSquare and X icons.
 * Shows an unread dot with pulse animation when there are unread responses.
 */

import { MessageSquare, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

interface WidgetFabProps {
  isOpen: boolean;
  hasUnread: boolean;
  unreadCount: number;
  onClick: () => void;
}

export function WidgetFab({ hasUnread, isOpen, onClick, unreadCount }: WidgetFabProps) {
  function getLabel() {
    if (isOpen) return 'Close assistant';
    if (hasUnread) return `Open assistant (${String(unreadCount)} unread)`;
    return 'Open assistant';
  }

  const label = getLabel();

  return (
    <button
      aria-label={label}
      className={cn(
        'fixed right-6 bottom-6 z-40',
        'flex h-12 w-12 items-center justify-center rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
      )}
      onClick={onClick}
    >
      {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}

      {hasUnread && !isOpen ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -top-0.5 -right-0.5',
            'flex h-4 w-4 items-center justify-center',
            'rounded-full text-[10px] font-bold',
            'bg-destructive text-destructive-foreground',
            'animate-pulse-subtle',
          )}
        >
          {unreadCount > 9 ? '9+' : String(unreadCount)}
        </span>
      ) : null}
    </button>
  );
}
