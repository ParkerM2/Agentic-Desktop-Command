/**
 * Shared CSS class constants for webhook settings components.
 */

import { cn } from '@renderer/shared/lib/utils';

export const INPUT_CLASS =
  'border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm pr-10 focus:ring-1 focus:outline-none';

const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors';

export const SAVE_BUTTON_CLASS = cn(
  BUTTON_BASE,
  'bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
);
