/**
 * usePersonalPage — logic for PersonalPage
 */

import { useEffect } from 'react';

import { useSearch } from '@tanstack/react-router';

import { usePersonalStore } from '../../store';

export function usePersonalPage() {
  const { activeTab, setActiveTab } = usePersonalStore();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const search = useSearch({ strict: false });
  const tabFromUrl = (search as { tab?: string } | undefined)?.tab;

  // Sync URL ?tab= param to store on mount / when URL changes
  useEffect(() => {
    if (tabFromUrl !== undefined) {
      setActiveTab(tabFromUrl as typeof activeTab);
    }
  }, [tabFromUrl, setActiveTab]);

  return {
    activeTab,
    setActiveTab,
  };
}
