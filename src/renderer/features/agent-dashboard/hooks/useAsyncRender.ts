/**
 * useAsyncRender — Unified loading/error/empty state derivation.
 *
 * Extracts the repetitive isLoading/isError/isEmpty branching found in
 * component hooks that consume React Query results. Returns a flat
 * object the component can destructure for conditional rendering.
 */

interface AsyncQuery<T> {
  isLoading: boolean;
  isError: boolean;
  data: T | undefined;
}

interface AsyncRenderState<T> {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  data: T | undefined;
}

export function useAsyncRender<T>(query: AsyncQuery<T>): AsyncRenderState<T> {
  return {
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: query.data === undefined || query.data === null || (Array.isArray(query.data) && query.data.length === 0),
    data: query.data,
  };
}
