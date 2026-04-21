/**
 * StorageManagementSection — TanStack Table with inline editing for data stores
 */

import { flexRender } from '@tanstack/react-table';
import { Download, RefreshCw, Upload } from 'lucide-react';

import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';
import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  SearchInput,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui';

import { StorageUsageBar } from '../StorageUsageBar';

import { useStorageManagementSection } from './useStorageManagementSection';

export function StorageManagementSection() {
  const {
    registry,
    usage,
    runCleanup,
    exportData,
    importData,
    confirmClearEntry,
    setConfirmClearEntry,
    globalFilter,
    setGlobalFilter,
    isLoading,
    isError,
    columns,
    table,
    clearingStoreId,
    handleClearConfirm,
    handleExport,
    handleImport,
    addToast,
    formatBytes,
  } = useStorageManagementSection();

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
        loading={clearingStoreId !== null}
        open={confirmClearEntry !== null}
        title={confirmClearEntry ? `Clear ${confirmClearEntry.label}?` : ''}
        variant="destructive"
        description={
          confirmClearEntry
            ? `This will remove all data from "${confirmClearEntry.label}". This action cannot be undone.`
            : ''
        }
        onConfirm={handleClearConfirm}
        onOpenChange={(open) => {
          if (!open) setConfirmClearEntry(null);
        }}
      />
    </div>
  );
}
