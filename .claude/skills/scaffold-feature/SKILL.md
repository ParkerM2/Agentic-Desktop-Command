---
name: scaffold-feature
description: Scaffold a new Feature Slice Design domain. Generates all 8 layers (channels, contract, schema, service, handlers, hooks, components, barrel) from a domain name.
---

# Scaffold Feature

Generate a complete Feature Slice Design domain from a domain name.

## Usage

```
/scaffold-feature <domain-name>
```

Example: `/scaffold-feature notifications`

## What Gets Created

Given domain name `{domain}` (kebab-case) and PascalCase `{Domain}`:

### 1. Channel Constants
**File:** `src/shared/ipc/{domain}/channels.ts`
```typescript
import { domain } from '../channel-builder';

export const {DOMAIN} = domain('{domain}', {
  LIST: ['{domain}s'],
  GET: ['{domain}'],
  CREATE: ['{domain}'],
  UPDATE: ['{domain}'],
  DELETE: ['{domain}'],
});
```

### 2. Contract Schema
**File:** `src/shared/ipc/{domain}/contract.ts`
```typescript
import { z } from 'zod';
import { {DOMAIN} } from './channels';

export const {domain}Invoke = {
  [{DOMAIN}.LIST.{DOMAIN}S]: {
    input: z.object({}),
    output: z.array(z.object({ id: z.string(), name: z.string() })),
  },
  [{DOMAIN}.GET.{DOMAIN}]: {
    input: z.object({ id: z.string() }),
    output: z.object({ id: z.string(), name: z.string() }),
  },
  [{DOMAIN}.CREATE.{DOMAIN}]: {
    input: z.object({ name: z.string() }),
    output: z.object({ id: z.string() }),
  },
  [{DOMAIN}.UPDATE.{DOMAIN}]: {
    input: z.object({ id: z.string(), name: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [{DOMAIN}.DELETE.{DOMAIN}]: {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;
```

### 3. Database Schema
**File:** `src/main/features/{domain}/schema.ts`
```typescript
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const {domain}Table = sqliteTable('{domain}s', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

### 4. Service
**File:** `src/main/features/{domain}/{domain}-service.ts`
```typescript
import type { AdcDatabase } from '../../core/database';
import { {domain}Table } from './schema';
import { generateId } from '@shared/utils/id';

export function create{Domain}Service(deps: { db: AdcDatabase }) {
  const { db } = deps;
  return {
    async list() { return db.select().from({domain}Table); },
    async get(id: string) { return db.select().from({domain}Table).where(eq({domain}Table.id, id)).then(r => r[0]); },
    async create(data: { name: string; id?: string }) {
      const id = data.id ?? generateId();
      await db.insert({domain}Table).values({ id, name: data.name });
      return { id };
    },
    async update(id: string, data: { name: string }) {
      await db.update({domain}Table).set({ name: data.name, updatedAt: new Date().toISOString() }).where(eq({domain}Table.id, id));
      return { success: true };
    },
    async delete(id: string) {
      await db.delete({domain}Table).where(eq({domain}Table.id, id));
      return { success: true };
    },
  };
}
```

### 5. IPC Handlers
**File:** `src/main/features/{domain}/{domain}-handlers.ts`
```typescript
import type { IpcRouter } from '../../core/ipc-router';
import { {DOMAIN} } from '@shared/ipc/{domain}/channels';

export function register{Domain}Handlers(router: IpcRouter, service: ReturnType<typeof create{Domain}Service>) {
  router.handle({DOMAIN}.LIST.{DOMAIN}S, () => service.list());
  router.handle({DOMAIN}.GET.{DOMAIN}, ({ id }) => service.get(id));
  router.handle({DOMAIN}.CREATE.{DOMAIN}, (input) => service.create(input));
  router.handle({DOMAIN}.UPDATE.{DOMAIN}, ({ id, ...data }) => service.update(id, data));
  router.handle({DOMAIN}.DELETE.{DOMAIN}, ({ id }) => service.delete(id));
}
```

### 6. React Query Hooks
**File:** `src/renderer/features/{domain}/api/use{Domain}.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@renderer/shared/lib/ipc';
import { {DOMAIN} } from '@shared/ipc/{domain}/channels';

const keys = {
  all: ['{domain}'] as const,
  list: () => [...keys.all, 'list'] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function use{Domain}List() {
  return useQuery({ queryKey: keys.list(), queryFn: () => ipc({DOMAIN}.LIST.{DOMAIN}S, {}) });
}

export function use{Domain}(id: string) {
  return useQuery({ queryKey: keys.detail(id), queryFn: () => ipc({DOMAIN}.GET.{DOMAIN}, { id }) });
}

export function useCreate{Domain}() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => ipc({DOMAIN}.CREATE.{DOMAIN}, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
```

### 7. Page Component
**File:** `src/renderer/features/{domain}/components/{Domain}Page.tsx`
```typescript
import { PageLayout, PageHeader, PageHeaderTitle, PageContent } from '@ui';

export function {Domain}Page() {
  return (
    <PageLayout>
      <PageHeader>
        <PageHeaderTitle>{Domain}</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        {/* TODO: implement UI */}
      </PageContent>
    </PageLayout>
  );
}
```

### 8. Barrel Export
**File:** `src/renderer/features/{domain}/index.ts`
```typescript
export { {Domain}Page } from './components/{Domain}Page';
```

## After Scaffolding

1. Register the contract in `src/shared/ipc/ipc-contract.ts`
2. Register the schema in the Drizzle config
3. Wire handlers in `src/main/bootstrap/ipc-wiring.ts`
4. Add EventBridge mapping in `src/renderer/shared/components/EventBridge.tsx`
5. Add route in the appropriate route group file
6. Add nav item in `src/renderer/app/layouts/Sidebar.tsx`
7. Run `npm run typecheck` to verify
