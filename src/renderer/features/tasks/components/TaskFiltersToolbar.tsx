/**
 * TaskFiltersToolbar -- Filter bar above the AG-Grid:
 * Text search, status multi-select, priority multi-select, clear filters button.
 */

import { useState } from 'react';

import { Plus, Search, X } from 'lucide-react';

import type { TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Input } from '@ui';

import { useTaskUI } from '../store';

import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskStatusBadge } from './TaskStatusBadge';

const ALL_STATUSES: TaskStatus[] = [
  'backlog',
  'planning',
  'plan_ready',
  'queued',
  'running',
  'paused',
  'review',
  'done',
  'error',
];

interface FilterDropdownProps {
  label: string;
  options: readonly string[];
  selectedOptions: string[];
  onToggle: (option: string) => void;
  renderOption?: (option: string, isSelected: boolean) => React.ReactNode;
}

function FilterDropdown({
  label,
  options,
  selectedOptions,
  onToggle,
  renderOption,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        variant="outline"
        className={cn(
          selectedOptions.length > 0 && 'border-primary',
        )}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{label}</span>
        {selectedOptions.length > 0 ? (
          <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs">
            {selectedOptions.length}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <>
          <Button
            aria-label={`Close ${label.toLowerCase()} filter`}
            className="fixed inset-0 z-40 h-full w-full cursor-default rounded-none"
            tabIndex={-1}
            variant="ghost"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="listbox"
            className={cn(
              'bg-popover border-border absolute top-full right-0 z-50 mt-1',
              'w-48 rounded-md border p-1 shadow-lg',
            )}
          >
            {options.map((option) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <Button
                  key={option}
                  aria-selected={isSelected}
                  role="option"
                  variant="ghost"
                  className={cn(
                    'flex w-full justify-start gap-2 px-2 py-1.5',
                    isSelected && 'bg-muted/30',
                  )}
                  onClick={() => onToggle(option)}
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
                  {renderOption ? renderOption(option, isSelected) : (
                    <span className="text-foreground text-sm capitalize">
                      {option.replaceAll('_', ' ')}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function TaskFiltersToolbar() {
  const gridSearchText = useTaskUI((s) => s.gridSearchText);
  const filterStatuses = useTaskUI((s) => s.filterStatuses);
  const setGridSearchText = useTaskUI((s) => s.setGridSearchText);
  const toggleFilterStatus = useTaskUI((s) => s.toggleFilterStatus);
  const clearFilters = useTaskUI((s) => s.clearFilters);
  const createDialogOpen = useTaskUI((s) => s.createDialogOpen);
  const setCreateDialogOpen = useTaskUI((s) => s.setCreateDialogOpen);

  const hasActiveFilters = filterStatuses.length > 0 || gridSearchText.length > 0;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* New Task button */}
        <Button
          variant="primary"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </Button>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            aria-label="Search tasks"
            className="pl-9"
            placeholder="Search tasks..."
            type="text"
            value={gridSearchText}
            onChange={(e) => setGridSearchText(e.target.value)}
          />
        </div>

        {/* Status multi-select */}
        <FilterDropdown
          label="Status"
          options={ALL_STATUSES}
          selectedOptions={filterStatuses}
          renderOption={(status) => (
            <TaskStatusBadge status={status as TaskStatus} />
          )}
          onToggle={(status) => toggleFilterStatus(status as TaskStatus)}
        />

        {/* Clear filters */}
        {hasActiveFilters ? (
          <Button
            variant="ghost"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" />
            <span>Clear</span>
          </Button>
        ) : null}
      </div>

      <CreateTaskDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
