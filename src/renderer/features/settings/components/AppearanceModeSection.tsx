/**
 * AppearanceModeSection — Light / Dark / System mode toggle
 */

import { Monitor, Moon, Sun } from 'lucide-react';

import type { ThemeMode } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

// ── Constants ───────────────────────────────────────────────

const THEME_MODE_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

// ── Component ───────────────────────────────────────────────

interface AppearanceModeSectionProps {
  currentMode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
}

export function AppearanceModeSection({ currentMode, onModeChange }: AppearanceModeSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Appearance
      </h2>
      <div className="flex gap-3">
        {THEME_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            className={cn(
              'border-border flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
              'hover:bg-accent',
              currentMode === opt.mode && 'border-primary bg-accent',
            )}
            onClick={() => onModeChange(opt.mode)}
          >
            <opt.icon className="h-6 w-6" />
            <span className="text-sm">{opt.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
