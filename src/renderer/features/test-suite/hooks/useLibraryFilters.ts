import { useMemo, useState } from 'react';

import type { QaScriptSchema } from '@shared/ipc/test-suite';

import type { StatusFilter } from '../test-suite-store';
import type { z } from 'zod';

type QaScript = z.infer<typeof QaScriptSchema>;

interface AllRun {
  scriptId: string;
  startedAt: string;
  status: string;
}

interface UseLibraryFiltersInput {
  allRuns: AllRun[];
  flakySet: Set<string>;
  scripts: QaScript[];
  statusFilter: StatusFilter;
}

export function useLibraryFilters({
  allRuns,
  flakySet,
  scripts,
  statusFilter,
}: UseLibraryFiltersInput) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const s of scripts) {
      for (const t of s.tags) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  }, [scripts]);

  const lastStatusByScript = useMemo(() => {
    const latestStartByScript = new Map<string, string>();
    const statusMap = new Map<string, string>();
    for (const run of allRuns) {
      const prevStart = latestStartByScript.get(run.scriptId);
      if (!prevStart || run.startedAt > prevStart) {
        latestStartByScript.set(run.scriptId, run.startedAt);
        statusMap.set(run.scriptId, run.status);
      }
    }
    return statusMap;
  }, [allRuns]);

  const getLastStatus = (scriptId: string): string | undefined =>
    lastStatusByScript.get(scriptId);

  const matchesSearch = (name: string) =>
    name.toLowerCase().includes(search.toLowerCase());

  const statusCounts = useMemo(
    () => ({
      all: scripts.filter((s) => matchesSearch(s.name)).length,
      passed: scripts.filter(
        (s) => matchesSearch(s.name) && getLastStatus(s.id) === 'passed',
      ).length,
      failed: scripts.filter(
        (s) => matchesSearch(s.name) && getLastStatus(s.id) === 'failed',
      ).length,
      flaky: scripts.filter(
        (s) => matchesSearch(s.name) && flakySet.has(s.id),
      ).length,
      'no-runs': scripts.filter(
        (s) => matchesSearch(s.name) && !getLastStatus(s.id),
      ).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scripts, search, flakySet, lastStatusByScript],
  );

  const filtered = useMemo(
    () =>
      scripts.filter((s) => {
        if (!matchesSearch(s.name)) return false;
        if (statusFilter !== 'all') {
          if (statusFilter === 'flaky' && !flakySet.has(s.id)) return false;
          else if (statusFilter === 'no-runs' && getLastStatus(s.id))
            return false;
          else if (
            statusFilter !== 'flaky' &&
            statusFilter !== 'no-runs' &&
            getLastStatus(s.id) !== statusFilter
          )
            return false;
        }
        if (selectedTags.size > 0) {
          const scriptTags = new Set(s.tags);
          for (const t of selectedTags) {
            if (!scriptTags.has(t)) return false;
          }
        }
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scripts, search, statusFilter, flakySet, lastStatusByScript, selectedTags],
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearTags = () => setSelectedTags(new Set());

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString();

  return {
    allTags,
    clearTags,
    filtered,
    formatDate,
    search,
    selected,
    selectedTags,
    setSearch,
    statusCounts,
    toggleAll,
    toggleSelect,
    toggleTag,
  } as const;
}
