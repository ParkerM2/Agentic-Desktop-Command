# Caching Layer Quickguide

> Step-by-step reference for any feature that reads or writes IPC data.
> Follow this guide exactly -- no ad-hoc event listeners, no domain data in Zustand stores.

## Architecture (3 Layers)

```
IPC Events -> EventBridge -> React Query Cache -> Components
                                  ^
                            Mutations (onSuccess invalidation)
```

> **No optimistic updates.** IPC round-trips are <1ms, so optimistic updates add complexity
> without perceptible UX benefit. All mutations use simple `onSuccess` invalidation.
> The old `src/renderer/shared/lib/optimistic.ts` has been deleted.

- **Layer 1: EventBridge** (`src/renderer/shared/components/EventBridge.tsx`) -- maps IPC events to query key invalidation
- **Layer 2: Feature Queries** (`features/<name>/api/`) -- useQuery for reads, useMutation for writes
- **Layer 3: UI Stores** (`features/<name>/store.ts`) -- selection, layout, filter state ONLY

## Adding a New Feature with IPC Data

### Step 1: Create query key factory

File: `src/renderer/features/<name>/api/queryKeys.ts`

```typescript
export const featureKeys = {
  all:    ['feature-name'] as const,
  list:   () => [...featureKeys.all, 'list'] as const,
  detail: (id: string) => [...featureKeys.all, 'detail', id] as const,
};
```

### Step 2: Create query hooks

File: `src/renderer/features/<name>/api/use<Name>.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { ipc } from '@renderer/shared/lib/ipc';
import { featureKeys } from './queryKeys';

export function useFeatureList() {
  return useQuery({
    queryKey: featureKeys.list(),
    queryFn: () => ipc('feature.list', {}),
    staleTime: 30_000,
  });
}
```

### Step 3: Create mutation hooks

File: `src/renderer/features/<name>/api/use<Name>Mutations.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';
import { featureKeys } from './queryKeys';

export function useCreateFeature() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: CreateInput) => ipc('feature.create', data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: featureKeys.list() });
    },
    onError: onError('create feature'),
  });
}
```

### Step 4: Register IPC events in EventBridge

File: `src/renderer/shared/components/EventBridge.tsx`

Add entries to `EVENT_REGISTRY`:
```typescript
'event:feature.created': { keys: [['feature-name', 'list']] },
'event:feature.updated': { keys: [['feature-name', 'list'], ['feature-name', 'detail']] },
'event:feature.deleted': { keys: [['feature-name', 'list']] },
```

### Step 5: Use in components

```typescript
const { data: items = [], isLoading } = useFeatureList();
const createMutation = useCreateFeature();

// Read:
if (isLoading) return <Spinner />;
return items.map(item => <Row key={item.id} item={item} />);

// Write:
createMutation.mutate({ name: 'new item' });
```

## Adding a New IPC Event

1. Open `src/renderer/shared/components/EventBridge.tsx`
2. Add entry to `EVENT_REGISTRY`:
   ```typescript
   'event:domain.eventName': { keys: [['query-key-prefix']] },
   ```
3. Done. No feature-level event listeners needed.

For streaming/append events (rare -- only for live data like agent messages):
```typescript
'event:domain.eventName': { keys: [['query-key']], handler: 'append' },
```
Then add the append logic in EventBridge's `handleAppend` function.

## Rules (Enforced)

1. `store.ts` MUST NOT contain `useQuery`, `useMutation`, `ipc()`, or domain data types
2. `api/` files MUST NOT import from Zustand stores
3. No `useIpcEvent` in feature code for data freshness -- EventBridge owns all invalidation
4. No `refetchInterval` on any query -- events drive freshness
5. Every feature with IPC data MUST have `api/queryKeys.ts` with factory pattern
6. Query keys MUST use factory pattern, not inline arrays
7. Mutations MUST invalidate via `onSuccess`/`onSettled`, not external event listeners
8. No optimistic updates — IPC is <1ms; use simple `onSuccess` invalidation

## Anti-Patterns (Never Do These)

| Don't | Do Instead |
|-------|-----------|
| `useIpcEvent('event:x', () => refetch())` | Add event to EventBridge registry |
| `useQuery({ refetchInterval: 5000 })` | Register IPC event in EventBridge |
| `store.ts` with `tasks: Task[]` | `useQuery` in `api/use<Name>.ts` |
| `const data = useStore((s) => s.domainData)` | `const { data } = useQuery(...)` |
| Hydrator component for data sync | Hook in `shared/hooks/` or EventBridge |
| `window.api.on()` in feature code | EventBridge registry entry |
| Inline query key `['tasks', 'list']` | `taskKeys.list()` from queryKeys.ts |
