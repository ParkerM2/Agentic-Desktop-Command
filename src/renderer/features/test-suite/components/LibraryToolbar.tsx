import { Plus } from 'lucide-react';

import { Button, Flex, SearchInput, Stack } from '@ui';

import type { StatusFilter } from '../test-suite-store';

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  passed: 'Passed',
  failed: 'Failed',
  flaky: 'Flaky',
  'no-runs': 'No runs',
};

const FILTER_OPTIONS: StatusFilter[] = [
  'all',
  'passed',
  'failed',
  'flaky',
  'no-runs',
];

interface LibraryToolbarProps {
  search: string;
  statusCounts: Record<StatusFilter, number>;
  statusFilter: StatusFilter;
  onNewTest: () => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
}

export function LibraryToolbar({
  search,
  statusCounts,
  statusFilter,
  onNewTest,
  onSearchChange,
  onStatusFilterChange,
}: LibraryToolbarProps) {
  return (
    <Stack className="border-b border-border px-4 py-3" gap="sm">
      <Flex align="center" gap="sm" wrap="nowrap">
        <SearchInput
          className="flex-1"
          data-testid="test-suite-search"
          placeholder="Search tests..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
        />
        <Button size="sm" onClick={onNewTest}>
          <Plus className="h-4 w-4" /> New Test
        </Button>
      </Flex>
      <Flex align="center" gap="sm">
        {FILTER_OPTIONS.map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant={statusFilter === filter ? 'primary' : 'outline'}
            onClick={() => onStatusFilterChange(filter)}
          >
            {`${FILTER_LABELS[filter]} (${statusCounts[filter]})`}
          </Button>
        ))}
      </Flex>
    </Stack>
  );
}
