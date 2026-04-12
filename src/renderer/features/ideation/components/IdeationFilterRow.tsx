/**
 * IdeationFilterRow — Search, category, and tag filter controls for the Ideation page.
 */

import { X } from 'lucide-react';

import type { IdeaCategory } from '@shared/types';

import { Badge, Button, SearchInput } from '@ui';

const FILTER_OPTIONS: Array<{ value: IdeaCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'feature', label: 'Features' },
  { value: 'improvement', label: 'Improvements' },
  { value: 'bug', label: 'Bugs' },
  { value: 'performance', label: 'Performance' },
];

interface IdeationFilterRowProps {
  activeFilter: IdeaCategory | 'all';
  onFilterChange: (filter: IdeaCategory | 'all') => void;
  allTags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function IdeationFilterRow({
  activeFilter,
  allTags,
  onClearTags,
  onFilterChange,
  onSearchChange,
  onTagToggle,
  searchQuery,
  selectedTags,
}: IdeationFilterRowProps) {
  const hasTagFilters = selectedTags.length > 0;
  const hasTags = allTags.length > 0;

  return (
    <div className="space-y-2">
      {/* Search */}
      <SearchInput
        className="max-w-sm"
        placeholder="Search ideas…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onClear={() => onSearchChange('')}
      />

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            className="rounded-full"
            size="sm"
            type="button"
            variant={activeFilter === option.value ? 'primary' : 'ghost'}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Tag filters */}
      {hasTags ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Tags:</span>
          {allTags.map((tag) => {
            const isActive = selectedTags.includes(tag);
            return (
              <Button
                key={tag}
                aria-label={isActive ? `Remove tag filter ${tag}` : `Filter by tag ${tag}`}
                aria-pressed={isActive}
                className="h-auto rounded-full p-0"
                type="button"
                variant="ghost"
                onClick={() => onTagToggle(tag)}
              >
                <Badge variant={isActive ? 'default' : 'outline'}>
                  {tag}
                </Badge>
              </Button>
            );
          })}
          {hasTagFilters ? (
            <Button
              aria-label="Clear tag filters"
              className="h-5 w-5"
              size="icon"
              type="button"
              variant="ghost"
              onClick={onClearTags}
            >
              <X className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
