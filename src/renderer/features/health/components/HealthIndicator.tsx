/**
 * HealthIndicator -- Badge-style health status for the TopBar
 *
 * Shows a colored badge with status text and pulsing dot.
 * Background has opacity matching the status color.
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
  bgClass: string;
  textClass: string;
  label: string;
}

const HEALTH_MAP: Record<HealthLevel, HealthConfig> = {
  healthy: {
    dotClass: 'bg-success',
    bgClass: 'bg-success/10',
    textClass: 'text-success',
    label: 'Healthy',
  },
  warning: {
    dotClass: 'bg-warning',
    bgClass: 'bg-warning/10',
    textClass: 'text-warning',
    label: 'Warning',
  },
  error: {
    dotClass: 'bg-destructive',
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
    label: 'Error',
  },
};

function deriveHealthLevel(
  errorCount: number,
  warningCount: number,
): HealthLevel {
  if (errorCount > 0) return 'error';
  if (warningCount > 0) return 'warning';
  return 'healthy';
}

// -- Component --

export function HealthIndicator() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: stats } = useErrorStats();
  useHealthStatus();

  const errorCount = stats?.bySeverity.error ?? 0;
  const warningCount = stats?.bySeverity.warning ?? 0;
  const level = deriveHealthLevel(errorCount, warningCount);
  const config = HEALTH_MAP[level];

  function handleToggle() {
    setIsOpen((prev) => !prev);
  }

  function handleClose() {
    setIsOpen(false);
  }

  return (
    <div className="relative flex h-full items-center">
      <button
        aria-label={config.label}
        title={config.label}
        type="button"
        className={cn(
          'flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors',
          config.bgClass,
          config.textClass,
        )}
        onClick={handleToggle}
      >
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            config.dotClass,
            level === 'healthy' && 'animate-pulse',
          )}
        />
        {config.label}
      </button>

      {isOpen ? (
        <HealthPanel isOpen={isOpen} onClose={handleClose} />
      ) : null}
    </div>
  );
}
