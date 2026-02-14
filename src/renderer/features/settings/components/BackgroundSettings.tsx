/**
 * BackgroundSettings -- Tray, startup, and background behavior settings
 *
 * Toggles for: launch at startup, minimize to tray, start minimized,
 * keep running in background. Loads initial values from settings.
 */

import { useEffect, useState } from 'react';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';

import { useSettings, useUpdateSettings } from '../api/useSettings';

// -- Types --

interface ToggleRowProps {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}

// -- Toggle Row --

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <button
        aria-checked={checked}
        aria-label={label}
        role="switch"
        type="button"
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

// -- Component --

export function BackgroundSettings() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [keepRunning, setKeepRunning] = useState(true);

  // Hydrate from settings when data loads
  useEffect(() => {
    if (settings) {
      setMinimizeToTray(settings.minimizeToTray ?? false);
      setStartMinimized(settings.startMinimized ?? false);
      setKeepRunning(settings.keepRunning ?? true);
      setOpenAtLogin(settings.openAtLogin ?? false);
    }
  }, [settings]);

  function handleOpenAtLogin(checked: boolean) {
    setOpenAtLogin(checked);
    void ipc('app.setOpenAtLogin', { enabled: checked });
    updateSettings.mutate({ openAtLogin: checked });
  }

  function handleMinimizeToTray(checked: boolean) {
    setMinimizeToTray(checked);
    updateSettings.mutate({ minimizeToTray: checked });
  }

  function handleStartMinimized(checked: boolean) {
    setStartMinimized(checked);
    updateSettings.mutate({ startMinimized: checked });
  }

  function handleKeepRunning(checked: boolean) {
    setKeepRunning(checked);
    updateSettings.mutate({ keepRunning: checked });
  }

  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Background &amp; Startup
      </h2>
      <div className="border-border bg-card divide-border divide-y rounded-lg border px-4">
        <ToggleRow
          checked={openAtLogin}
          description="Automatically launch the app when you log in to your computer"
          label="Launch at system startup"
          onChange={handleOpenAtLogin}
        />
        <ToggleRow
          checked={minimizeToTray}
          description="Minimize to system tray instead of closing the window"
          label="Minimize to tray on close"
          onChange={handleMinimizeToTray}
        />
        <ToggleRow
          checked={startMinimized}
          description="Start the app minimized to the system tray"
          label="Start minimized"
          onChange={handleStartMinimized}
        />
        <ToggleRow
          checked={keepRunning}
          description="Keep background services running when the window is closed"
          label="Keep running in background"
          onChange={handleKeepRunning}
        />
      </div>
    </section>
  );
}
