import type { QueryClient } from '@tanstack/react-query';

/**
 * Optimistic create — adds item to cache immediately, rolls back on error.
 *
 * @param queryClient - React Query client
 * @param queryKey - The query key for the list cache to update
 * @param toOptimistic - Function that builds the optimistic cache item from mutation input
 */
export function optimisticCreate<TInput, TItem>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  toOptimistic: (input: TInput) => TItem,
) {
  return {
    async onMutate(input: TInput) {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) => [
        toOptimistic(input),
        ...old,
      ]);
      return { previous };
    },
    onError(_err: unknown, _input: TInput, context: { previous?: TItem[] } | undefined) {
      if (context?.previous) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previous);
      }
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Optimistic update — patches item in cache immediately, rolls back on error.
 */
export function optimisticUpdate<TInput extends { id: string }, TItem extends { id: string }>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  applyUpdate: (existing: TItem, input: TInput) => TItem,
) {
  return {
    async onMutate(input: TInput) {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map((item) => (item.id === input.id ? applyUpdate(item, input) : item)),
      );
      return { previous };
    },
    onError(_err: unknown, _input: TInput, context: { previous?: TItem[] } | undefined) {
      if (context?.previous) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previous);
      }
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Optimistic delete — removes item from cache immediately, rolls back on error.
 */
export function optimisticDelete<TItem extends { id: string }>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
) {
  return {
    async onMutate(id: string) {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.filter((item) => item.id !== id),
      );
      return { previous };
    },
    onError(_err: unknown, _id: string, context: { previous?: TItem[] } | undefined) {
      if (context?.previous) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previous);
      }
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey });
    },
  };
}
