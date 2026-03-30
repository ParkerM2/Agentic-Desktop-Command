/**
 * AgentLayoutToolbar — Layout mode selector, project filter, status filter
 *
 * Top toolbar for the agent dashboard. Controls layout mode and filters.
 */

import { Grid3x3, LayoutPanelLeft } from 'lucide-react';

import type { AgentDashboardFilters, AgentLayoutMode, AgentStatus } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

// ─── Props ─────────────────────────────────────────────────

interface AgentLayoutToolbarProps {
  layoutMode: AgentLayoutMode;
  filters: AgentDashboardFilters;
  projectOptions: Array<{ id: string; name: string }>;
  className?: string;
  onLayoutChange: (mode: AgentLayoutMode) => void;
  onFilterChange: (filters: AgentDashboardFilters) => void;
}

// ─── Status Options ────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: AgentStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'running', label: 'Running' },
  { value: 'idle', label: 'Idle' },
  { value: 'attention', label: 'Needs Attention' },
  { value: 'failed', label: 'Failed' },
  { value: 'completed', label: 'Completed' },
];

// ─── Component ─────────────────────────────────────────────

export function AgentLayoutToolbar({
  layoutMode,
  filters,
  projectOptions,
  className,
  onLayoutChange,
  onFilterChange,
}: AgentLayoutToolbarProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Layout Toggle */}
      <div className="flex rounded-md border border-input bg-background">
        <Button
          aria-label="Single layout"
          size="sm"
          variant="ghost"
          className={cn(
            'rounded-r-none',
            layoutMode === 'single' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => { onLayoutChange('single'); }}
        >
          <LayoutPanelLeft className="mr-1.5 h-3.5 w-3.5" />
          Single
        </Button>
        <Button
          aria-label="Grid layout"
          size="sm"
          variant="ghost"
          className={cn(
            'rounded-l-none',
            layoutMode === 'grid' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => { onLayoutChange('grid'); }}
        >
          <Grid3x3 className="mr-1.5 h-3.5 w-3.5" />
          Grid
        </Button>
      </div>

      {/* Project Filter */}
      {projectOptions.length > 0 ? (
        <Select
          value={filters.projectId ?? 'all'}
          onValueChange={(value) => {
            onFilterChange({
              ...filters,
              projectId: value === 'all' ? undefined : value,
            });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectOptions.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {/* Status Filter */}
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(value) => {
          onFilterChange({
            ...filters,
            status: value === 'all' ? undefined : value as AgentStatus,
          });
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
