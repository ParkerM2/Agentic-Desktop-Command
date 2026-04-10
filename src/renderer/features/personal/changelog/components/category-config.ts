import { Plus, RefreshCw, Shield, Trash2, Wrench, X } from 'lucide-react';

import type { ChangeType } from '@shared/types';

export const CATEGORY_CONFIG: Record<
  ChangeType,
  { label: string; icon: React.ComponentType<{ className?: string }>; cssVar: string }
> = {
  added: { label: 'Added', icon: Plus, cssVar: '--success' },
  changed: { label: 'Changed', icon: RefreshCw, cssVar: '--info' },
  fixed: { label: 'Fixed', icon: Wrench, cssVar: '--warning' },
  removed: { label: 'Removed', icon: Trash2, cssVar: '--destructive' },
  security: { label: 'Security', icon: Shield, cssVar: '--warning' },
  deprecated: { label: 'Deprecated', icon: X, cssVar: '--muted-foreground' },
};
