/**
 * FilterBar — URL-synced filter controls composition
 *
 * Controlled component: consumer owns filter state and URL sync.
 * FilterBar renders the UI; caller wires useSearch/useNavigate for URL binding.
 */

import { Search, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

// ─── Types ───────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multi-select';
  options?: FilterOption[];
}

export interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string | string[]>;
  onChange: (key: string, value: string | string[]) => void;
  onClear?: () => void;
  className?: string;
}

// ─── Sub-component: MultiSelectFilter ────────────────────

interface MultiSelectFilterProps {
  filter: FilterConfig;
  selected: string[];
  onToggle: (value: string) => void;
}

function MultiSelectFilter({ filter, selected, onToggle }: MultiSelectFilterProps) {
  const hasSelected = selected.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {(filter.options ?? []).map((opt) => {
        const isActive = selected.includes(opt.value);
        return (
          <Button
            key={opt.value}
            aria-pressed={isActive}
            size="sm"
            variant={isActive ? 'secondary' : 'outline'}
            onClick={() => onToggle(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
      {hasSelected ? (
        <Button
          aria-label={`Clear ${filter.label} filter`}
          size="sm"
          variant="ghost"
          onClick={() => onToggle('')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────

export function FilterBar({ filters, values, onChange, onClear, className }: FilterBarProps) {
  const hasActiveFilters = Object.values(values).some((v) =>
    Array.isArray(v) ? v.length > 0 : v.length > 0,
  );

  function renderFilter(filter: FilterConfig) {
    if (filter.type === 'text') {
      const textValue = typeof values[filter.key] === 'string'
        ? (values[filter.key] as string)
        : '';

      return (
        <div key={filter.key} className="relative min-w-[180px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            aria-label={filter.label}
            className="pl-9"
            placeholder={`${filter.label}...`}
            type="text"
            value={textValue}
            onChange={(e) => onChange(filter.key, e.target.value)}
          />
        </div>
      );
    }

    if (filter.type === 'select') {
      const selectValue = typeof values[filter.key] === 'string'
        ? (values[filter.key] as string)
        : '';

      return (
        <div key={filter.key} className="min-w-[140px]">
          <Select
            value={selectValue}
            onValueChange={(val) => onChange(filter.key, val)}
          >
            <SelectTrigger aria-label={filter.label}>
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              {(filter.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // filter.type === 'multi-select' at this point
    const multiValue = Array.isArray(values[filter.key])
      ? (values[filter.key] as string[])
      : [];

    function handleToggle(val: string) {
      if (val === '') {
        onChange(filter.key, []);
        return;
      }
      const next = multiValue.includes(val)
        ? multiValue.filter((v) => v !== val)
        : [...multiValue, val];
      onChange(filter.key, next);
    }

    return (
      <MultiSelectFilter
        key={filter.key}
        filter={filter}
        selected={multiValue}
        onToggle={handleToggle}
      />
    );
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-[var(--layout-gap-lg)] px-[var(--layout-pad-md)] py-[var(--layout-gap-lg)]', className)}
      data-testid="filter-bar"
    >
      {filters.map((filter) => renderFilter(filter))}

      {hasActiveFilters && onClear ? (
        <Button size="sm" variant="ghost" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
