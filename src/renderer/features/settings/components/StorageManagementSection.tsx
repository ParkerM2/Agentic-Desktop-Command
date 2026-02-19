/**
 * StorageManagementSection — Main storage management panel for Settings
 *
 * Sections: Storage Overview, Auto Cleanup, Data Stores, Actions
 */

import { useState } from 'react';

import { Download, RefreshCw, Upload } from 'lucide-react';

import type { RetentionPolicy } from '@shared/types/data-management';


import { cn } from '@renderer/shared/lib/utils';
import { useToastStore } from '@renderer/shared/stores';

import { Button, Checkbox, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@ui';

import {
  useClearStore,
  useDataRegistry,
  useDataRetention,
  useDataUsage,
  useExportData,
  useImportData,
  useRunCleanup,
  useUpdateRetention,
} from '../api/useDataManagement';
import { useDataManagementEvents } from '../hooks/useDataManagementEvents';

import { RetentionControl } from './RetentionControl';
import { StorageUsageBar } from './StorageUsageBar';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const base = 1024;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / base ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

const CLEANUP_INTERVALS = [1, 6, 12, 24, 48, 72, 168] as const;

function getIntervalLabel(hours: number): string {
  if (hours < 24) return `${String(hours)}h`;
  if (hours === 24) return '1 day';
  if (hours === 168) return '1 week';
  return `${String(hours / 24)} days`;
}

function renderContent(state: {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  children: React.ReactNode;
}): React.ReactNode {
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="text-muted-foreground" size="md" />
      </div>
    );
  }
  if (state.isError) {
    return (
      <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4">
        <p className="text-destructive text-sm">{state.errorMessage}</p>
      </div>
    );
  }
  return state.children;
}

export function StorageManagementSection() {
  const registry = useDataRegistry();
  const usage = useDataUsage();
  const retention = useDataRetention();
  const updateRetention = useUpdateRetention();
  const clearStore = useClearStore();
  const runCleanup = useRunCleanup();
  const exportData = useExportData();
  const importData = useImportData();
  const addToast = useToastStore((s) => s.addToast);

  const [clearingStoreId, setClearingStoreId] = useState<string | null>(null);

  // Live event subscription
  useDataManagementEvents();

  const isLoading =
    registry.isLoading || usage.isLoading || retention.isLoading;
  const isError = registry.isError || usage.isError || retention.isError;
  const errorMessage =
    registry.error?.message ?? usage.error?.message ?? retention.error?.message ?? 'Failed to load storage data';

  function handleAutoCleanupToggle() {
    if (retention.data === undefined) return;
    updateRetention.mutate({
      autoCleanupEnabled: !retention.data.autoCleanupEnabled,
    });
  }

  function handleIntervalChange(value: string) {
    const hours = Number(value);
    updateRetention.mutate({ cleanupIntervalHours: hours });
  }

  function handleRetentionUpdate(storeId: string, policy: Partial<RetentionPolicy>) {
    if (retention.data === undefined) return;
    const current = retention.data.overrides[storeId] ?? { enabled: true };
    updateRetention.mutate({
      overrides: {
        ...retention.data.overrides,
        [storeId]: { ...current, ...policy } as RetentionPolicy,
      },
    });
  }

  function handleClearStore(storeId: string) {
    setClearingStoreId(storeId);
    clearStore.mutate(storeId, {
      onSuccess: () => {
        addToast('Store cleared successfully', 'success');
        setClearingStoreId(null);
      },
      onError: () => {
        setClearingStoreId(null);
      },
    });
  }

  function handleRunCleanup() {
    runCleanup.mutate(undefined, {
      onSuccess: (result) => {
        addToast(
          `Cleanup complete: removed ${String(result.cleaned)} items, freed ${formatBytes(result.freedBytes)}`,
          'success',
        );
      },
    });
  }

  function handleExport() {
    exportData.mutate(undefined, {
      onSuccess: (result) => {
        addToast(`Data exported to ${result.filePath}`, 'success');
      },
    });
  }

  function handleImport() {
    // Use a hidden file input for file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.zip';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
        // Electron file inputs provide the full path via .path
        const filePath = (file as unknown as { path: string }).path;
        importData.mutate(filePath, {
          onSuccess: (result) => {
            addToast(`Imported ${String(result.imported)} stores successfully`, 'success');
          },
        });
      }
    });
    input.click();
  }

  const usageMap = new Map(
    (usage.data ?? []).map((item) => [item.id, item]),
  );

  return renderContent({
    isLoading,
    isError,
    errorMessage,
    children: (
      <div className="space-y-6">
        {/* ── Storage Overview ── */}
        {registry.data !== undefined && usage.data !== undefined ? (
          <StorageUsageBar registry={registry.data} usage={usage.data} />
        ) : null}

        {/* ── Auto Cleanup ── */}
        {retention.data === undefined ? null : (
          <div className="border-border bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2" htmlFor="auto-cleanup-toggle">
                <Checkbox
                  checked={retention.data.autoCleanupEnabled}
                  id="auto-cleanup-toggle"
                  onCheckedChange={() => {
                    handleAutoCleanupToggle();
                  }}
                />
                Auto cleanup
              </Label>
              {retention.data.autoCleanupEnabled ? (
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs" htmlFor="cleanup-interval">
                    Every:
                  </Label>
                  <Select
                    value={String(retention.data.cleanupIntervalHours)}
                    onValueChange={handleIntervalChange}
                  >
                    <SelectTrigger className="h-7 w-20 text-xs" id="cleanup-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLEANUP_INTERVALS.map((hours) => (
                        <SelectItem key={hours} value={String(hours)}>
                          {getIntervalLabel(hours)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            {retention.data.lastCleanupAt === undefined ? null : (
              <p className="text-muted-foreground mt-1.5 text-xs">
                Last cleanup: {new Date(retention.data.lastCleanupAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* ── Data Stores ── */}
        {(registry.data?.length ?? 0) > 0 ? (
          <div className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Data Stores
            </h3>
            {registry.data?.map((entry) => (
              <RetentionControl
                key={entry.id}
                clearPending={clearingStoreId === entry.id}
                entry={entry}
                retention={retention.data?.overrides[entry.id]}
                usage={usageMap.get(entry.id)}
                onClear={() => {
                  handleClearStore(entry.id);
                }}
                onUpdate={(policy) => {
                  handleRetentionUpdate(entry.id, policy);
                }}
              />
            )) ?? null}
          </div>
        ) : null}

        {/* ── Actions ── */}
        <div className="border-border bg-card rounded-lg border p-4">
          <h3 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
            Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={runCleanup.isPending}
              size="sm"
              variant="primary"
              onClick={handleRunCleanup}
            >
              {runCleanup.isPending ? (
                <Spinner size="sm" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Run Cleanup Now
            </Button>
            <Button
              disabled={exportData.isPending}
              size="sm"
              variant="outline"
              onClick={handleExport}
            >
              {exportData.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export Data
            </Button>
            <Button
              disabled={importData.isPending}
              size="sm"
              variant="outline"
              className={cn(
                'disabled:pointer-events-none disabled:opacity-50',
              )}
              onClick={handleImport}
            >
              {importData.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Import Data
            </Button>
          </div>
        </div>
      </div>
    ),
  });
}
