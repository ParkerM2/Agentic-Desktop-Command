/**
 * Type-safe wrapper for TanStack Router's useParams({ strict: false }).
 *
 * strict: false returns `any` which triggers no-unsafe-assignment.
 * This hook narrows the return type to a string-keyed record.
 */

import { useParams } from '@tanstack/react-router';

export function useLooseParams(): Record<string, string | undefined> {
  // TanStack Router's strict:false intentionally returns any for cross-route usage
  return useParams({ strict: false });
}
