/**
 * SettingsPage — App settings view
 */

import { Sun, Moon, Monitor, Loader2 } from 'lucide-react';

import type { ThemeMode } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';
import { useThemeStore } from '@renderer/shared/stores';

import { useSettings, useUpdateSettings } from '../api/useSettings';

const themeOptions: Array<{
  mode: ThemeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { mode, setMode } = useThemeStore();

  function handleThemeChange(newMode: ThemeMode) {
    setMode(newMode);
    updateSettings.mutate({ theme: newMode });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      {/* Theme */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          Appearance
        </h2>
        <div className="flex gap-3">
          {themeOptions.map((opt) => (
            <button
              key={opt.mode}
              className={cn(
                'border-border flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                'hover:bg-accent',
                mode === opt.mode && 'border-primary bg-accent',
              )}
              onClick={() => handleThemeChange(opt.mode)}
            >
              <opt.icon className="h-6 w-6" />
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* More settings sections will go here */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
          About
        </h2>
        <p className="text-muted-foreground text-sm">
          Claude UI v{settings?.onboardingCompleted ? '0.1.0' : '0.0.1'}
        </p>
      </section>
    </div>
  );
}
