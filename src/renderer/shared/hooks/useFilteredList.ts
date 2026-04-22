/**
 * useFilteredList — shared pattern for search + sort over a list.
 *
 * Provides debounced search, optional sort, and returns the filtered result
 * alongside the total count.
 */

import { useMemo, useState } from 'react';

import { useDebounce } from './useDebounce';

export function useFilteredList<T>(
  items: T[],
  config: {
    searchFn: (item: T, query: string) => boolean;
    sortFn?: (a: T, b: T) => number;
  },
) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);

  const filtered = useMemo(() => {
    let result = items;
    if (debouncedSearch) {
      result = result.filter((item) => config.searchFn(item, debouncedSearch));
    }
    if (config.sortFn) {
      result = [...result].sort(config.sortFn);
    }
    return result;
  }, [items, debouncedSearch, config]);

  return { searchQuery, setSearchQuery, filtered, total: items.length };
}
