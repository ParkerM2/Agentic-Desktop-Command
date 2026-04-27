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

import { Badge, Button, Heading, ScrollArea, Separator, Tabs, TabsContent, TabsList, TabsTrigger } from '@ui';

import {
  useClearErrorLog,
  useErrorLog,
  useHealthStatus,
} from '../../api/useHealth';

// -- Types --

interface HealthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SeverityFilter = 'all' | ErrorSeverity;

// -- Constants --

const SERVICE_STATUS_CONFIG = {
  healthy: { dotClass: 'bg-success', label: 'Healthy' },
  unhealthy: { dotClass: 'bg-destructive', label: 'Unhealthy' },
  stopped: { dotClass: 'bg-muted-foreground', label: 'Stopped' },
} as const;

// -- Sub-components --

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

function getSeverityVariant(severity: ErrorSeverity): 'destructive' | 'warning' | 'info' {
  if (severity === 'error') return 'destructive';
  if (severity === 'warning') return 'warning';
  return 'info';
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
            <Badge size="sm" variant={getSeverityVariant(entry.severity)}>
              {entry.severity}
            </Badge>
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
        <>
          <Separator />
          <div className="bg-muted/30 px-3 py-2">
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
          <Button
            className="mt-2 h-auto p-0 text-[10px]"
            type="button"
            variant="ghost"
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
          </Button>
          </div>
        </>
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
        <Heading as="h3" className="text-sm">
          System Health
        </Heading>
        <Button
          aria-label="Close health panel"
          size="icon"
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Service Health Table */}
      {services.length > 0 ? (
        <div className="border-border border-b px-4 py-3">
          <Heading as="h4" className="text-muted-foreground mb-2 text-[10px] uppercase tracking-wide">
            Services
          </Heading>
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
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as SeverityFilter)}
      >
        <TabsList className="h-auto w-full rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            className="flex-1 rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            value="all"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            className="flex-1 rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            value="error"
          >
            Errors
          </TabsTrigger>
          <TabsTrigger
            className="flex-1 rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            value="warning"
          >
            Warnings
          </TabsTrigger>
          <TabsTrigger
            className="flex-1 rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            value="info"
          >
            Info
          </TabsTrigger>
        </TabsList>

        {/* Error Log — shared content area for all filter tabs */}
        {(['all', 'error', 'warning', 'info'] as const).map((tab) => (
          <TabsContent key={tab} className="mt-0" value={tab}>
            <ScrollArea className="max-h-96">
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
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {/* Footer Actions */}
      <Separator />
      <div className="flex items-center justify-end gap-2 px-4 py-2">
        <Button
          className="h-auto gap-1 px-2 py-1 text-xs"
          type="button"
          variant="ghost"
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
        </Button>
        <Button
          className="text-muted-foreground hover:text-destructive h-auto gap-1 px-2 py-1 text-xs"
          type="button"
          variant="ghost"
          onClick={() => {
            setConfirmClearOpen(true);
          }}
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </Button>
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
