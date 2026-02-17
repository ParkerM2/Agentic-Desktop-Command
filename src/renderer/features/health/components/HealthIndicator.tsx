/**
 * HealthIndicator -- Compact health dot for the TopBar
 *
 * Shows a colored pulsing dot indicating overall application health.
 * Green = healthy, Amber = warnings only, Red = errors present.
 * Click toggles the HealthPanel popover.
 */

import { useState } from 'react';

import { cn } from '@renderer/shared/lib/utils';

import { useErrorStats, useHealthStatus } from '@features/health';

import { HealthPanel } from './HealthPanel';

// -- Helpers --

type HealthLevel = 'healthy' | 'warning' | 'error';

interface HealthConfig {
  dotClass: string;
  label: string;
}

const HEALTH_MAP: Record<HealthLevel, HealthConfig> = {
  healthy: { dotClass: 'bg-success', label: 'ADC is healthy' },
  warning: { dotClass: 'bg-warning', label: 'warnings' },
  error: { dotClass: 'bg-destructive', label: 'errors' },
};

function deriveHealthLevel(
  errorCount: number,
  warningCount: number,
): HealthLevel {
  if (errorCount > 0) return 'error';
  if (warningCount > 0) return 'warning';
  return 'healthy';
}

function buildLabel(level: HealthLevel, count: number): string {
  if (level === 'healthy') return 'ADC is healthy';
  return `${count} ${level === 'error' ? 'errors' : 'warnings'}`;
}

// -- Component --

export function HealthIndicator() {
  // 1. Hooks
  const [isOpen, setIsOpen] = useState(false);
  const { data: stats } = useErrorStats();
  // Fetch health status to keep it cached for the HealthPanel
  useHealthStatus();

  // 2. Derived state
  const errorCount = stats?.bySeverity.error ?? 0;
  const warningCount = stats?.bySeverity.warning ?? 0;
  const level = deriveHealthLevel(errorCount, warningCount);
  const config = HEALTH_MAP[level];
  const displayCount = level === 'error' ? errorCount : warningCount;
  const label = buildLabel(level, displayCount);

  // 3. Handlers
  function handleToggle() {
    setIsOpen((prev) => !prev);
  }

  function handleClose() {
    setIsOpen(false);
  }

  // 4. Render
  return (
    <div className="relative">
      <button
        aria-label={label}
        title={label}
        type="button"
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
        onClick={handleToggle}
      >
        <span
          aria-hidden="true"
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            config.dotClass,
            level === 'healthy' && 'animate-pulse-subtle',
          )}
        />
        {level === 'healthy' ? null : (
          <span>{label}</span>
        )}
      </button>

      {isOpen ? (
        <HealthPanel isOpen={isOpen} onClose={handleClose} />
      ) : null}
    </div>
  );
}
