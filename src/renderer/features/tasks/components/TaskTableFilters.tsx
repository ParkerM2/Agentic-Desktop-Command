/**
 * TaskTableFilters — Search, status multi-select, and clear button
 */

import { useState } from 'react';

import { Search, X } from 'lucide-react';

import type { TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useTaskUI } from '../store';

import { TaskStatusBadge } from './TaskStatusBadge';

const ALL_STATUSES: TaskStatus[] = [
  'backlog',
  'queue',
  'in_progress',
  'ai_review',
  'human_review',
  'done',
  'pr_created',
  'error',
];

export function TaskTableFilters() {
  const searchQuery = useTaskUI((s) => s.searchQuery);
  const filterStatuses = useTaskUI((s) => s.filterStatuses);
  const setSearchQuery = useTaskUI((s) => s.setSearchQuery);
  const toggleFilterStatus = useTaskUI((s) => s.toggleFilterStatus);
  const clearFilters = useTaskUI((s) => s.clearFilters);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const hasActiveFilters = filterStatuses.length > 0 || searchQuery.length > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          aria-label="Search tasks"
          placeholder="Search tasks..."
          type="text"
          value={searchQuery}
          className={cn(
            'bg-card border-border text-foreground placeholder:text-muted-foreground',
            'h-9 w-full rounded-md border py-2 pr-3 pl-9 text-sm',
            'focus:border-primary focus:ring-ring focus:ring-1 focus:outline-none',
          )}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Status multi-select dropdown */}
      <div className="relative">
        <button
          aria-expanded={statusDropdownOpen}
          aria-haspopup="listbox"
          type="button"
          className={cn(
            'bg-card border-border text-foreground',
            'flex h-9 items-center gap-2 rounded-md border px-3 text-sm',
            'hover:bg-muted/50 transition-colors',
            filterStatuses.length > 0 && 'border-primary',
          )}
          onClick={() => setStatusDropdownOpen((prev) => !prev)}
        >
          <span>Status</span>
          {filterStatuses.length > 0 ? (
            <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs">
              {filterStatuses.length}
            </span>
          ) : null}
        </button>

        {statusDropdownOpen ? (
          <>
            {/* Invisible backdrop to close dropdown on outside click */}
            <button
              aria-label="Close status filter"
              className="fixed inset-0 z-40 cursor-default"
              tabIndex={-1}
              type="button"
              onClick={() => setStatusDropdownOpen(false)}
            />
            <div
              role="listbox"
              className={cn(
                'bg-popover border-border absolute top-full right-0 z-50 mt-1',
                'w-48 rounded-md border p-1 shadow-lg',
              )}
            >
              {ALL_STATUSES.map((status) => {
                const isSelected = filterStatuses.includes(status);
                return (
                  <button
                    key={status}
                    aria-selected={isSelected}
                    role="option"
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm',
                      'hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-muted/30',
                    )}
                    onClick={() => toggleFilterStatus(status)}
                  >
                    <span
                      className={cn(
                        'border-border flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                        isSelected && 'bg-primary border-primary',
                      )}
                    >
                      {isSelected ? (
                        <svg
                          className="text-primary-foreground h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </span>
                    <TaskStatusBadge status={status} />
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* Clear filters */}
      {hasActiveFilters ? (
        <button
          type="button"
          className={cn(
            'text-muted-foreground hover:text-foreground',
            'flex h-9 items-center gap-1 rounded-md px-2 text-sm transition-colors',
          )}
          onClick={clearFilters}
        >
          <X className="h-4 w-4" />
          <span>Clear</span>
        </button>
      ) : null}
    </div>
  );
}
