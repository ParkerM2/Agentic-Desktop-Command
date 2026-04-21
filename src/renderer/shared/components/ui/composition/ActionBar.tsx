/**
 * ActionBar — Sticky bottom contextual action buttons
 *
 * Sticky bottom-0 with border-t and bg-card.
 * Renders action buttons from the actions config array.
 */

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

import type { ButtonProps } from '@ui';

// ─── Types ───────────────────────────────────────────────

export interface ActionConfig {
  key: string;
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface ActionBarProps {
  actions: ActionConfig[];
  className?: string;
}

// ─── Component ───────────────────────────────────────────

export function ActionBar({ actions, className }: ActionBarProps) {
  const hasActions = actions.length > 0;

  return hasActions ? (
    <div
      data-testid="action-bar"
      className={cn(
        'border-border bg-card sticky bottom-0 flex items-center justify-end gap-[var(--layout-gap)] border-t px-[var(--layout-pad-md)] py-[var(--layout-gap-lg)]',
        className,
      )}
    >
      {actions.map((action) => (
        <Button
          key={action.key}
          disabled={action.disabled}
          variant={action.variant ?? 'primary'}
          onClick={action.onClick}
        >
          {action.icon === undefined ? null : action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  ) : null;
}
