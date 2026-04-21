import { useCallback, useState } from 'react';

import { useTaskUI } from '../../store';

export interface FilterDropdownState {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

export function useFilterDropdown(): FilterDropdownState {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, toggle, close };
}

export function useTaskFiltersToolbar() {
  const gridSearchText = useTaskUI((s) => s.gridSearchText);
  const filterStatuses = useTaskUI((s) => s.filterStatuses);
  const setGridSearchText = useTaskUI((s) => s.setGridSearchText);
  const toggleFilterStatus = useTaskUI((s) => s.toggleFilterStatus);
  const clearFilters = useTaskUI((s) => s.clearFilters);
  const createDialogOpen = useTaskUI((s) => s.createDialogOpen);
  const setCreateDialogOpen = useTaskUI((s) => s.setCreateDialogOpen);

  const hasActiveFilters = filterStatuses.length > 0 || gridSearchText.length > 0;

  return {
    gridSearchText,
    filterStatuses,
    setGridSearchText,
    toggleFilterStatus,
    clearFilters,
    createDialogOpen,
    setCreateDialogOpen,
    hasActiveFilters,
  };
}
