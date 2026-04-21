/**
 * BackgroundSettings -- Tray, startup, and background behavior settings
 *
 * Toggles for: launch at startup, minimize to tray, start minimized,
 * keep running in background. Loads initial values from settings.
 */

import { Switch } from '@ui';

import { useBackgroundSettings } from './useBackgroundSettings';

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
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}

// -- Component --

export function BackgroundSettings() {
  const {
    openAtLogin,
    minimizeToTray,
    startMinimized,
    keepRunning,
    handleOpenAtLogin,
    handleMinimizeToTray,
    handleStartMinimized,
    handleKeepRunning,
  } = useBackgroundSettings();

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
