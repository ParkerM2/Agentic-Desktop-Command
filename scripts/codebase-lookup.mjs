#!/usr/bin/env node
/**
 * Codebase Lookup — fast file/domain resolution for Claude Code hooks.
 *
 * Usage: node scripts/codebase-lookup.mjs <query>
 *
 * Resolves queries like:
 *   "visualization"     → all files for the visualization domain
 *   "service:alerts"    → src/main/services/alerts/
 *   "feature:tasks"     → src/renderer/features/tasks/
 *   "ipc:auth"          → src/shared/ipc/auth/ + handler + service
 *   "type:project"      → src/shared/types/project.ts
 *   "ui:button"         → src/renderer/shared/components/ui/button.tsx
 *   "hook:useIpcEvent"  → src/renderer/shared/hooks/useIpcEvent.ts
 *   "doc:visualization" → docs matching "visualization"
 *   "handler:git"       → src/main/ipc/handlers/git-handlers.ts
 *
 * Outputs JSON for programmatic consumption.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

// ─── Domain Maps ──────────────────────────────────────────

const DOMAIN_TRACE = (domain) => ({
  contract: `src/shared/ipc/${domain}/contract.ts`,
  schemas: `src/shared/ipc/${domain}/schemas.ts`,
  service: `src/main/services/${domain}/index.ts`,
  handler: `src/main/ipc/handlers/${domain}-handlers.ts`,
  feature: `src/renderer/features/${domain}/`,
  types: `src/shared/types/${domain}.ts`,
});

const PREFIXED = {
  service: (name) => [`src/main/services/${name}/index.ts`, `src/main/services/${name}/`],
  feature: (name) => [`src/renderer/features/${name}/index.ts`, `src/renderer/features/${name}/`],
  ipc: (name) => [
    `src/shared/ipc/${name}/contract.ts`,
    `src/shared/ipc/${name}/schemas.ts`,
    `src/shared/ipc/${name}/index.ts`,
    `src/main/ipc/handlers/${name}-handlers.ts`,
    `src/main/services/${name}/index.ts`,
  ],
  type: (name) => [`src/shared/types/${name}.ts`],
  ui: (name) => [`src/renderer/shared/components/ui/${name}.tsx`],
  hook: (name) => [`src/renderer/shared/hooks/${name}.ts`],
  handler: (name) => [`src/main/ipc/handlers/${name}-handlers.ts`],
  store: (name) => [`src/renderer/shared/stores/${name}.ts`, `src/renderer/features/${name}/store.ts`],
  doc: (name) => [
    `docs/features/${name}/plan.md`,
    `docs/architecture/${name}.md`,
    `docs/patterns/${name}.md`,
    `docs/routing/${name}.md`,
    `docs/specs/*${name}*.md`,
    `docs/research/*${name}*.md`,
  ],
  route: (name) => [`src/renderer/app/routes/${name}.routes.ts`],
  constant: (name) => [`src/shared/constants/${name}.ts`],
  layout: (name) => [`src/renderer/app/layouts/${name}.tsx`],
  bootstrap: (name) => [`src/main/bootstrap/${name}.ts`],
};

// ─── Resolve ──────────────────────────────────────────────

function resolve_query(query) {
  // Prefixed query: "service:alerts"
  const prefixMatch = query.match(/^(\w+):(.+)$/);
  if (prefixMatch) {
    const [, prefix, name] = prefixMatch;
    const resolver = PREFIXED[prefix];
    if (resolver) {
      const paths = resolver(name);
      const existing = paths.filter((p) => !p.includes('*') && existsSync(resolve(ROOT, p)));
      return { query, prefix, name, paths, existing };
    }
    return { query, error: `Unknown prefix: ${prefix}` };
  }

  // Bare query: full domain trace
  const trace = DOMAIN_TRACE(query);
  const all = Object.entries(trace);
  const existing = all
    .filter(([, p]) => existsSync(resolve(ROOT, p)))
    .map(([role, path]) => ({ role, path }));

  return { query, domain: query, trace, existing };
}

// ─── Main ─────────────────────────────────────────────────

const query = process.argv[2];
if (!query) {
  console.error('Usage: node scripts/codebase-lookup.mjs <query>');
  process.exit(1);
}

const result = resolve_query(query);
console.log(JSON.stringify(result, null, 2));
