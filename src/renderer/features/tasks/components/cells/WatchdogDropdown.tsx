/**
 * WatchdogDropdown — Alert action dropdown for watchdog alerts on task rows.
 *
 * Shows alert message and recovery action buttons when a watchdog
 * alert is active for a task. Opened by clicking the warning overlay
 * on the StatusBadgeCell.
 */

import { useEffect, useRef, useState } from 'react';

import { AlertTriangle, FileText, Play, RefreshCw, XCircle } from 'lucide-react';

import type { EventPayload } from '@shared/ipc-contract';

import { cn } from '@renderer/shared/lib/utils';

type WatchdogAlertPayload = EventPayload<'event:agent.orchestrator.watchdogAlert'>;

interface WatchdogDropdownProps {
  alert: WatchdogAlertPayload;
  onRestartCheckpoint: () => void;
  onRestartFresh: () => void;
  onViewLogs: () => void;
  onMarkError: () => void;
}

export function WatchdogDropdown({
  alert,
  onRestartCheckpoint,
  onRestartFresh,
  onViewLogs,
  onMarkError,
}: WatchdogDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const isWarning = alert.type === 'warning';
  const isCritical = alert.type === 'dead' || alert.type === 'stale';

  function handleToggle(event: React.MouseEvent) {
    event.stopPropagation();
    setOpen((previous) => !previous);
  }

  function handleAction(action: () => void) {
    return (event: React.MouseEvent) => {
      event.stopPropagation();
      action();
      setOpen(false);
    };
  }

  function handleKeyAction(action: () => void) {
    return (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.stopPropagation();
        event.preventDefault();
        action();
        setOpen(false);
      }
    };
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        aria-label="Watchdog alert"
        className={cn(
          'ml-1 inline-flex items-center rounded-full p-0.5 transition-colors',
          isWarning
            ? 'text-warning hover:bg-warning/20'
            : 'text-destructive hover:bg-destructive/20',
        )}
        onClick={handleToggle}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div
          ref={dropdownRef}
          className="bg-popover border-border absolute top-full right-0 z-50 mt-1 w-64 rounded-md border shadow-lg"
          role="menu"
        >
          {/* Alert message */}
          <div
            className={cn(
              'border-b px-3 py-2 text-xs font-medium',
              isCritical
                ? 'border-destructive/20 bg-destructive/10 text-destructive'
                : 'border-warning/20 bg-warning/10 text-warning',
            )}
          >
            {alert.message}
          </div>

          {/* Actions */}
          <div className="p-1">
            <div
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs"
              role="menuitem"
              tabIndex={0}
              onClick={handleAction(onRestartCheckpoint)}
              onKeyDown={handleKeyAction(onRestartCheckpoint)}
            >
              <Play className="text-muted-foreground h-3.5 w-3.5" />
              <span>Restart from checkpoint</span>
            </div>

            <div
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs"
              role="menuitem"
              tabIndex={0}
              onClick={handleAction(onRestartFresh)}
              onKeyDown={handleKeyAction(onRestartFresh)}
            >
              <RefreshCw className="text-muted-foreground h-3.5 w-3.5" />
              <span>Restart from scratch</span>
            </div>

            <div
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs"
              role="menuitem"
              tabIndex={0}
              onClick={handleAction(onViewLogs)}
              onKeyDown={handleKeyAction(onViewLogs)}
            >
              <FileText className="text-muted-foreground h-3.5 w-3.5" />
              <span>View logs</span>
            </div>

            <div
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs"
              role="menuitem"
              tabIndex={0}
              onClick={handleAction(onMarkError)}
              onKeyDown={handleKeyAction(onMarkError)}
            >
              <XCircle className="text-muted-foreground h-3.5 w-3.5" />
              <span>Mark as error</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
