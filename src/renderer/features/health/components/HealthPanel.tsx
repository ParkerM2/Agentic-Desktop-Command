/**
 * HealthPanel -- Popover panel showing service health and error log
 *
 * Anchored below the HealthIndicator dot, right-aligned.
 * Shows service health table, filterable error log, and footer actions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Info,
  Trash2,
  X,
} from 'lucide-react';

import type { ErrorEntry, ErrorSeverity } from '@shared/types';

import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';
import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

import {
  useClearErrorLog,
  useErrorLog,
  useHealthStatus,
} from '@features/health';

// -- Types --

interface HealthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SeverityFilter = 'all' | ErrorSeverity;

// -- Constants --

const SEVERITY_TABS: Array<{ label: string; value: SeverityFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Errors', value: 'error' },
  { label: 'Warnings', value: 'warning' },
  { label: 'Info', value: 'info' },
];

const SERVICE_STATUS_CONFIG = {
  healthy: { dotClass: 'bg-success', label: 'Healthy' },
  unhealthy: { dotClass: 'bg-destructive', label: 'Unhealthy' },
  stopped: { dotClass: 'bg-muted-foreground', label: 'Stopped' },
} as const;

// -- Sub-components --

function SeverityBadge({ severity }: { severity: ErrorSeverity }) {
  const config: Record<ErrorSeverity, { classes: string; label: string }> = {
    error: { classes: 'bg-destructive/10 text-destructive', label: 'error' },
    warning: { classes: 'bg-warning/10 text-warning', label: 'warning' },
    info: { classes: 'bg-info/10 text-info', label: 'info' },
  };

  const { classes, label } = config[severity];

  return (
    <span
      className={cn(
        'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
        classes,
      )}
    >
      {label}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: ErrorSeverity }) {
  if (severity === 'error') {
    return (
      <AlertTriangle
        aria-hidden="true"
        className="text-destructive h-3.5 w-3.5 shrink-0"
      />
    );
  }
  if (severity === 'warning') {
    return (
      <AlertTriangle
        aria-hidden="true"
        className="text-warning h-3.5 w-3.5 shrink-0"
      />
    );
  }
  return (
    <Info aria-hidden="true" className="text-info h-3.5 w-3.5 shrink-0" />
  );
}

function ErrorLogEntry({ entry }: { entry: ErrorEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleToggle() {
    setIsExpanded((prev) => !prev);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }

  function handleCopy() {
    const details = JSON.stringify(entry, undefined, 2);
    void navigator.clipboard.writeText(details);
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <div className="border-border border-b last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'hover:bg-accent/50 flex cursor-pointer items-start gap-2 px-3 py-2 transition-colors',
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        {isExpanded ? (
          <ChevronDown className="text-muted-foreground mt-0.5 h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground mt-0.5 h-3 w-3 shrink-0" />
        )}
        <SeverityIcon severity={entry.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={entry.severity} />
            <span className="text-muted-foreground text-[10px]">
              {entry.category}
            </span>
            <span className="text-muted-foreground ml-auto text-[10px]">
              {formatRelativeTime(entry.timestamp)}
            </span>
          </div>
          <p className="text-foreground mt-0.5 truncate text-xs">
            {entry.message}
          </p>
        </div>
      </div>

      {isExpanded ? (
        <div className="bg-muted/30 border-border border-t px-3 py-2">
          <div className="space-y-1 text-[10px]">
            {entry.context.route ? (
              <p className="text-muted-foreground">
                <span className="font-medium">Route:</span>{' '}
                {entry.context.route}
              </p>
            ) : null}
            {(entry.context.routeHistory?.length ?? 0) > 0 ? (
              <p className="text-muted-foreground">
                <span className="font-medium">History:</span>{' '}
                {entry.context.routeHistory?.join(' > ') ?? ''}
              </p>
            ) : null}
            {entry.stack ? (
              <pre className="text-muted-foreground mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px]">
                {entry.stack}
              </pre>
            ) : null}
          </div>
          <button
            className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 text-[10px] transition-colors"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Clipboard className="h-3 w-3" />
                Copy details
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// -- Main Component --

export function HealthPanel({ isOpen, onClose }: HealthPanelProps) {
  // 1. Hooks
  const panelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [copyAllDone, setCopyAllDone] = useState(false);

  const { data: healthStatus } = useHealthStatus();
  const { data: errorLogData } = useErrorLog();
  const clearLog = useClearErrorLog();

  // 2. Derived state
  const services = healthStatus?.services ?? [];
  const allEntries = errorLogData?.entries ?? [];
  const filteredEntries =
    filter === 'all'
      ? allEntries
      : allEntries.filter((e) => e.severity === filter);

  // 3. Outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }

    // Delay listener attachment to avoid closing on the same click that opens
    const timerId = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Escape closes panel
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // 4. Handlers
  function handleCopyAll() {
    const json = JSON.stringify(allEntries, undefined, 2);
    void navigator.clipboard.writeText(json);
    setCopyAllDone(true);
    window.setTimeout(() => {
      setCopyAllDone(false);
    }, 1500);
  }

  const handleClearConfirm = useCallback(() => {
    clearLog.mutate(undefined, {
      onSuccess: () => {
        setConfirmClearOpen(false);
      },
    });
  }, [clearLog]);

  if (!isOpen) return null;

  // 5. Render
  return (
    <div
      ref={panelRef}
      className="bg-card border-border animate-slide-up-panel absolute top-full right-0 z-50 mt-1 w-96 rounded-lg border shadow-xl"
    >
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-foreground text-sm font-semibold">
          System Health
        </h3>
        <button
          aria-label="Close health panel"
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Service Health Table */}
      {services.length > 0 ? (
        <div className="border-border border-b px-4 py-3">
          <h4 className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Services
          </h4>
          <div className="space-y-1.5">
            {services.map((svc) => {
              const statusConfig = SERVICE_STATUS_CONFIG[svc.status];
              return (
                <div
                  key={svc.name}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      statusConfig.dotClass,
                    )}
                  />
                  <span className="text-foreground flex-1">{svc.name}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {formatRelativeTime(svc.lastPulse)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Severity Filter Tabs */}
      <div className="border-border flex border-b">
        {SEVERITY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={cn(
              'flex-1 px-3 py-2 text-xs font-medium transition-colors',
              filter === tab.value
                ? 'border-primary text-foreground border-b-2'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => {
              setFilter(tab.value);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Log */}
      <div className="max-h-96 overflow-y-auto">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <ErrorLogEntry key={entry.id} entry={entry} />
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-muted-foreground text-xs">
              {filter === 'all'
                ? 'No errors recorded'
                : `No ${filter} entries`}
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-border flex items-center justify-end gap-2 border-t px-4 py-2">
        <button
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
          type="button"
          onClick={handleCopyAll}
        >
          {copyAllDone ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Clipboard className="h-3 w-3" />
              Copy All
            </>
          )}
        </button>
        <button
          className="text-muted-foreground hover:text-destructive flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
          type="button"
          onClick={() => {
            setConfirmClearOpen(true);
          }}
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>

      {/* Clear Confirmation */}
      <ConfirmDialog
        confirmLabel="Clear All"
        description="This will permanently remove all error log entries. This action cannot be undone."
        loading={clearLog.isPending}
        open={confirmClearOpen}
        title="Clear Error Log"
        variant="destructive"
        onConfirm={handleClearConfirm}
        onOpenChange={setConfirmClearOpen}
      />
    </div>
  );
}
