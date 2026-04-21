/**
 * useToday — returns today's date as an ISO date string (YYYY-MM-DD).
 *
 * Memoized so the value is stable within a single render cycle.
 */

import { useMemo } from 'react';

export function useToday(): string {
  return useMemo(() => new Date().toISOString().slice(0, 10), []);
}
