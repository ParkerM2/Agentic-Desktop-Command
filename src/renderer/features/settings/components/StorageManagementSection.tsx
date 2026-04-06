/**
 * StorageManagementSection — TanStack Table with inline editing for data stores
 */

import { useMemo, useState } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Download, RefreshCw, Trash2, Upload } from 'lucide-react';

import type { DataStoreEntry, DataStoreUsage, RetentionPolicy } from '@shared/types/data-management';

import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';
import { cn } from '@renderer/shared/lib/utils';
import { useToastStore } from '@renderer/shared/stores';

import {
  Badge,
  Button,
  Checkbox,
  Input,
  SearchInput,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui';

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

import { StorageUsageBar } from './StorageUsageBar';

import type { ColumnDef, SortingState } from '@tanstack/react-table';

// ── Helpers ────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const base = 1024;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / base ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function getLifecycleVariant(lifecycle: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (lifecycle) {
    case 'transient': return 'destructive';
    case 'persistent': return 'default';
    default: return 'secondary';
  }
}

// ── Row type ───────────────────────────────────────────────

interface StoreRow {
  entry: DataStoreEntry;
  usage?: DataStoreUsage;
  retention: RetentionPolicy;
}

// ── Component ──────────────────────────────────────────────

export function StorageManagementSection() {
  const registry = useDataRegistry();
  const usage = useDataUsage();
  const retentionQuery = useDataRetention();
  const updateRetention = useUpdateRetention();
  const clearStore = useClearStore();
  const runCleanup = useRunCleanup();
  const exportData = useExportData();
  const importData = useImportData();
  const addToast = useToastStore((s) => s.addToast);

  const [clearingStoreId, setClearingStoreId] = useState<string | null>(null);
  const [confirmClearEntry, setConfirmClearEntry] = useState<DataStoreEntry | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  useDataManagementEvents();

  const isLoading = registry.isLoading || usage.isLoading || retentionQuery.isLoading;
  const isError = registry.isError || usage.isError || retentionQuery.isError;

  // Build row data
  const usageMap = useMemo(
    () => new Map((usage.data ?? []).map((item) => [item.id, item])),
    [usage.data],
  );

  const rows = useMemo<StoreRow[]>(() => {
    if (!registry.data || !retentionQuery.data) return [];
    return registry.data.map((entry) => ({
      entry,
      usage: usageMap.get(entry.id),
      retention: retentionQuery.data.overrides[entry.id] ?? entry.defaultRetention,
    }));
  }, [registry.data, retentionQuery.data, usageMap]);

  // Handlers
  function handleRetentionToggle(storeId: string, currentEnabled: boolean) {
    if (!retentionQuery.data) return;
    const current = retentionQuery.data.overrides[storeId] ?? { enabled: currentEnabled };
    updateRetention.mutate({
      overrides: {
        ...retentionQuery.data.overrides,
        [storeId]: { ...current, enabled: !currentEnabled } as RetentionPolicy,
      },
    });
  }

  function handleFieldChange(storeId: string, field: 'maxAgeDays' | 'maxItems', value: string) {
    if (!retentionQuery.data) return;
    const num = Number(value);
    const current = retentionQuery.data.overrides[storeId] ?? { enabled: true };
    updateRetention.mutate({
      overrides: {
        ...retentionQuery.data.overrides,
        [storeId]: { ...current, [field]: num > 0 ? num : undefined } as RetentionPolicy,
      },
    });
  }

  function handleClearConfirm() {
    if (!confirmClearEntry) return;
    setClearingStoreId(confirmClearEntry.id);
    clearStore.mutate(confirmClearEntry.id, {
      onSuccess: () => {
        addToast('Store cleared successfully', 'success');
        setClearingStoreId(null);
        setConfirmClearEntry(null);
      },
      onError: () => {
        setClearingStoreId(null);
        setConfirmClearEntry(null);
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.zip';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
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

  /* eslint-disable react/no-unstable-nested-components -- TanStack Table cell renderers are render functions, not components */
  const columns = useMemo<Array<ColumnDef<StoreRow>>>(
    () => [
      {
        id: 'enabled',
        header: 'Active',
        size: 60,
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.retention.enabled}
            onCheckedChange={() =>
              handleRetentionToggle(row.original.entry.id, row.original.retention.enabled)
            }
          />
        ),
      },
      {
        id: 'label',
        accessorFn: (row) => row.entry.label,
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Store
            <ArrowUpDown />
          </Button>
        ),
        size: 200,
        cell: ({ row }) => (
          <div>
            <span className="text-foreground text-sm font-medium">{row.original.entry.label}</span>
            <span className="text-muted-foreground ml-2 text-xs">{row.original.entry.description}</span>
          </div>
        ),
      },
      {
        id: 'lifecycle',
        accessorFn: (row) => row.entry.lifecycle,
        header: 'Lifecycle',
        size: 100,
        cell: ({ row }) => (
          <Badge variant={getLifecycleVariant(row.original.entry.lifecycle)}>
            {row.original.entry.lifecycle}
          </Badge>
        ),
      },
      {
        id: 'size',
        accessorFn: (row) => row.usage?.sizeBytes ?? 0,
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Size
            <ArrowUpDown />
          </Button>
        ),
        size: 90,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.usage ? formatBytes(row.original.usage.sizeBytes) : '—'}
          </span>
        ),
      },
      {
        id: 'items',
        accessorFn: (row) => row.usage?.itemCount ?? 0,
        header: 'Items',
        size: 70,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.usage ? String(row.original.usage.itemCount) : '—'}
          </span>
        ),
      },
      {
        id: 'maxAgeDays',
        header: 'Max Age (days)',
        size: 120,
        cell: ({ row }) =>
          row.original.retention.enabled ? (
            <Input
              className="h-7 w-20 text-xs"
              min={0}
              placeholder="∞"
              type="number"
              value={row.original.retention.maxAgeDays ?? ''}
              onChange={(e) =>
                handleFieldChange(row.original.entry.id, 'maxAgeDays', e.target.value)
              }
            />
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        id: 'maxItems',
        header: 'Max Items',
        size: 100,
        cell: ({ row }) =>
          row.original.retention.enabled ? (
            <Input
              className="h-7 w-20 text-xs"
              min={0}
              placeholder="∞"
              type="number"
              value={row.original.retention.maxItems ?? ''}
              onChange={(e) =>
                handleFieldChange(row.original.entry.id, 'maxItems', e.target.value)
              }
            />
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        cell: ({ row }) =>
          row.original.entry.canClear ? (
            <Button
              disabled={clearingStoreId === row.original.entry.id}
              size="icon-xs"
              variant="ghost-destructive"
              onClick={() => setConfirmClearEntry(row.original.entry)}
            >
              {clearingStoreId === row.original.entry.id ? (
                <Spinner size="sm" />
              ) : (
                <Trash2 />
              )}
            </Button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers use retentionQuery.data which changes
    [clearingStoreId, retentionQuery.data],
  );
  /* eslint-enable react/no-unstable-nested-components */

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const label = row.original.entry.label.toLowerCase();
      const desc = row.original.entry.description.toLowerCase();
      const filter = filterValue.toLowerCase();
      return label.includes(filter) || desc.includes(filter);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.entry.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4">
        <span className="text-destructive text-sm">
          {registry.error?.message ?? usage.error?.message ?? 'Failed to load storage data'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage overview bar */}
      {registry.data && usage.data ? (
        <StorageUsageBar registry={registry.data} usage={usage.data} />
      ) : null}

      {/* Search + Actions */}
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          className="max-w-xs"
          placeholder="Search stores..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            disabled={runCleanup.isPending}
            size="sm"
            onClick={() =>
              runCleanup.mutate(undefined, {
                onSuccess: (result) => {
                  addToast(
                    `Cleanup: removed ${String(result.cleaned)} items, freed ${formatBytes(result.freedBytes)}`,
                    'success',
                  );
                },
              })
            }
          >
            {runCleanup.isPending ? <Spinner size="sm" /> : <RefreshCw />}
            Cleanup
          </Button>
          <Button disabled={exportData.isPending} size="sm" variant="outline" onClick={handleExport}>
            {exportData.isPending ? <Spinner size="sm" /> : <Download />}
            Export
          </Button>
          <Button disabled={importData.isPending} size="sm" variant="outline" onClick={handleImport}>
            {importData.isPending ? <Spinner size="sm" /> : <Upload />}
            Import
          </Button>
        </div>
      </div>

      {/* Data stores table */}
      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(!row.original.retention.enabled && 'opacity-50')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground h-24 text-center" colSpan={columns.length}>
                  No data stores found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Clear confirmation */}
      <ConfirmDialog
        confirmLabel="Clear"
        description={
          confirmClearEntry
            ? `This will remove all data from "${confirmClearEntry.label}". This action cannot be undone.`
            : ''
        }
        loading={clearingStoreId !== null}
        open={confirmClearEntry !== null}
        title={confirmClearEntry ? `Clear ${confirmClearEntry.label}?` : ''}
        variant="destructive"
        onConfirm={handleClearConfirm}
        onOpenChange={(open) => {
          if (!open) setConfirmClearEntry(null);
        }}
      />
    </div>
  );
}
