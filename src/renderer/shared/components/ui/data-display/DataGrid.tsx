/**
 * DataGrid — Generic TanStack Table + TanStack Virtual data grid
 *
 * Wraps TanStack Table for headless table logic and TanStack Virtual
 * for performant rendering of large datasets (1000+ rows).
 * Virtual scrolling activates automatically when row count > 50,
 * or can be controlled via the `virtualizeRows` prop.
 */

import { useRef, useState } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import { cn } from '@renderer/shared/lib/utils';

import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui';

import type { ColumnDef, Row, SortingState, Updater } from '@tanstack/react-table';

// ── Props ──────────────────────────────────────────────────

interface DataGridProps<T> {
  className?: string;
  columns: Array<ColumnDef<T>>;
  data: T[];
  emptyState?: React.ReactNode;
  getRowId?: (row: T) => string;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  onSortingChange?: (sorting: SortingState) => void;
  renderDetailRow?: (row: T) => React.ReactNode;
  virtualizeRows?: boolean;
}

// ── Helpers ────────────────────────────────────────────────

const VIRTUALIZE_THRESHOLD = 50;
const ESTIMATED_ROW_HEIGHT = 40;
const OVERSCAN = 10;

function resolveUpdater<S>(updater: Updater<S>, current: S): S {
  return typeof updater === 'function' ? (updater as (old: S) => S)(current) : updater;
}

// ── Component ──────────────────────────────────────────────

export function DataGrid<T>({
  className,
  columns,
  data,
  emptyState,
  getRowId,
  globalFilter,
  onGlobalFilterChange,
  onSortingChange,
  renderDetailRow,
  virtualizeRows,
}: DataGridProps<T>) {
  // 1. Hooks
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);

  // 2. Derived state
  const shouldVirtualize = virtualizeRows ?? data.length > VIRTUALIZE_THRESHOLD;

  // 3. Table instance
  const table = useReactTable<T>({
    data,
    columns,
    state: {
      sorting,
      globalFilter: globalFilter ?? '',
    },
    onSortingChange: (updater) => {
      const next = resolveUpdater(updater, sorting);
      setSorting(next);
      onSortingChange?.(next);
    },
    onGlobalFilterChange: (updater: Updater<string>) => {
      const next = resolveUpdater(updater, globalFilter ?? '');
      onGlobalFilterChange?.(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId,
  });

  const { rows } = table.getRowModel();

  // 4. Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN,
    enabled: shouldVirtualize,
  });

  // 5. Handlers
  function handleToggleExpand(rowId: string) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }

  // 6. Render helpers
  function renderStaticRow(row: Row<T>) {
    const rowId = row.id;
    const isExpanded = expandedRowIds.has(rowId);
    const hasDetailRow = renderDetailRow !== undefined;

    return (
      <>
        <TableRow
          key={rowId}
          className={hasDetailRow ? 'cursor-pointer' : undefined}
          data-state={isExpanded ? 'selected' : undefined}
          data-testid="data-grid-row"
          onClick={
            hasDetailRow
              ? () => {
                  handleToggleExpand(rowId);
                }
              : undefined
          }
        >
          {row.getVisibleCells().map((cell) => (
            <TableCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
        {isExpanded && hasDetailRow ? (
          <TableRow key={`${rowId}-detail`}>
            <TableCell className="bg-muted/20 p-4" colSpan={columns.length}>
              {renderDetailRow(row.original)}
            </TableCell>
          </TableRow>
        ) : null}
      </>
    );
  }

  function renderVirtualBody() {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();

    return (
      <TableBody style={{ height: `${String(totalSize)}px`, position: 'relative' }}>
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];
          const isExpanded = expandedRowIds.has(row.id);
          const hasDetailRow = renderDetailRow !== undefined;

          return (
            <>
              <TableRow
                key={row.id}
                className={hasDetailRow ? 'cursor-pointer' : undefined}
                data-state={isExpanded ? 'selected' : undefined}
                data-testid="data-grid-row"
                style={{
                  height: `${String(virtualRow.size)}px`,
                  left: 0,
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${String(virtualRow.start)}px)`,
                  width: '100%',
                }}
                onClick={
                  hasDetailRow
                    ? () => {
                        handleToggleExpand(row.id);
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {isExpanded && hasDetailRow ? (
                <TableRow
                  key={`${row.id}-detail`}
                  style={{
                    left: 0,
                    position: 'absolute',
                    top: 0,
                    transform: `translateY(${String(virtualRow.start + virtualRow.size)}px)`,
                    width: '100%',
                  }}
                >
                  <TableCell className="bg-muted/20 p-4" colSpan={columns.length}>
                    {renderDetailRow(row.original)}
                  </TableCell>
                </TableRow>
              ) : null}
            </>
          );
        })}
      </TableBody>
    );
  }

  function renderStaticBody() {
    return <TableBody>{rows.map((row) => renderStaticRow(row))}</TableBody>;
  }

  function renderEmptyState() {
    return emptyState === undefined ? (
      <EmptyState description="No data to display" title="No results" />
    ) : (
      emptyState
    );
  }

  // 7. Render
  return (
    <div className={cn('flex flex-col', className)} data-testid="data-grid">
      <div
        ref={shouldVirtualize ? parentRef : undefined}
        className={cn(
          'border-border overflow-hidden rounded-lg border',
          shouldVirtualize ? 'flex-1 overflow-auto' : undefined,
        )}
      >
        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            {shouldVirtualize ? renderVirtualBody() : renderStaticBody()}
          </Table>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
}
