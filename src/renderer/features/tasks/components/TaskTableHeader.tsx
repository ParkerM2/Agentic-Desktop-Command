/**
 * TaskTableHeader — Sortable column headers for the task table
 */

import { ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

export type SortColumn = 'title' | 'status' | 'project' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

interface TaskTableHeaderProps {
  allSelected: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSelectAll: () => void;
  onSort: (column: SortColumn) => void;
}

interface ColumnDef {
  key: SortColumn;
  label: string;
  className: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'title', label: 'Title', className: 'flex-1 min-w-0' },
  { key: 'status', label: 'Status', className: 'w-28' },
  { key: 'project', label: 'Project', className: 'w-36' },
  { key: 'updatedAt', label: 'Updated', className: 'w-24' },
];

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return <ChevronDown className="text-muted-foreground/30 h-3.5 w-3.5" />;
  }
  return direction === 'asc' ? (
    <ChevronUp className="text-foreground h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="text-foreground h-3.5 w-3.5" />
  );
}

export function TaskTableHeader({
  allSelected,
  sortColumn,
  sortDirection,
  onSelectAll,
  onSort,
}: TaskTableHeaderProps) {
  return (
    <div
      role="row"
      className={cn(
        'border-border bg-muted/30 flex items-center gap-3 border-b px-4 py-2',
      )}
    >
      {/* Select all checkbox */}
      <div className="w-8 shrink-0">
        <input
          aria-label="Select all tasks"
          checked={allSelected}
          className="accent-primary h-4 w-4 rounded"
          type="checkbox"
          onChange={onSelectAll}
        />
      </div>

      {/* Sortable columns */}
      {COLUMNS.map((col) => (
        <button
          key={col.key}
          type="button"
          className={cn(
            col.className,
            'flex items-center gap-1 text-left text-xs font-medium',
            'text-muted-foreground hover:text-foreground transition-colors',
            sortColumn === col.key && 'text-foreground',
          )}
          onClick={() => onSort(col.key)}
        >
          <span>{col.label}</span>
          <SortIndicator
            active={sortColumn === col.key}
            direction={sortDirection}
          />
        </button>
      ))}

      {/* Actions column header */}
      <div className="w-20 shrink-0 text-right text-xs font-medium text-muted-foreground">
        Actions
      </div>
    </div>
  );
}
