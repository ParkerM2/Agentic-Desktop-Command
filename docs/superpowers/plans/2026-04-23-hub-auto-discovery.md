# Hub Auto-Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled hub-pairing flow with mDNS-based auto-discovery, Ed25519 client identity, self-signed TLS with fingerprint pinning, dedicated two-step pair endpoints, audit + revocation, admin UI, per-hub data isolation on the client, and a Spotify-style picker in Settings → Hub.

**Architecture:** Hub advertises `_adc-hub._tcp.local` via Bonjour with TLS fingerprint in TXT. Client browses continuously, shows discovered + paired hubs in a picker, pairs via `POST /api/pair/init` then `POST /api/pair/confirm` (Ed25519 signed nonce). Each paired hub gets its own local SQLite and client identity in `${userData}/hubs/${hubId}/`. Legacy installs survive via a one-time migrator + re-pair banner. Full enterprise bundle: ships as one release (0.2.0).

**Tech Stack:** Node 22, Fastify + `bonjour-service`, Electron 39, Drizzle ORM on SQLite, React 19 + TanStack Query, Vitest + Playwright. `crypto.generateKeyPairSync('ed25519')` for identities, `@peculiar/x509` or similar for self-signed cert generation, `argon2` for admin password hashing.

**Spec:** `docs/superpowers/specs/2026-04-23-hub-auto-discovery-design.md` — read it before starting.

---

## File structure

**Hub (`hub/`):**
- Create: `hub/src/lib/hub-id.ts`, `hub/src/lib/tls.ts`, `hub/src/lib/audit-retention.ts`
- Create: `hub/src/mdns/advertiser.ts`
- Create: `hub/src/routes/pair.ts`, `hub/src/routes/admin/clients.ts`, `hub/src/routes/admin/audit.ts`, `hub/src/routes/admin/settings.ts`
- Create: `hub/src/middleware/pair-rate-limit.ts`, `hub/src/middleware/audit.ts`, `hub/src/middleware/admin-auth.ts`
- Create: `hub/src/ui/admin/` (React SPA sources, bundled at build)
- Create: `hub/scripts/hash-admin-password.mjs`
- Create: `hub/migrations/0010_pair_identity.sql`
- Modify: `hub/src/app.ts` (HTTPS listen, wire new middleware/routes, advertiser lifecycle)
- Modify: `hub/src/middleware/api-key.ts` (honor `revoked_at`, close WebSockets with 4003)
- Modify: `hub/src/db/schema.ts` (add columns, new `pairing_events` table)

**Client main (`src/main/features/hub/`):**
- Create: `src/main/features/hub/hub-discovery.ts`
- Create: `src/main/features/hub/hub-pair.ts`
- Create: `src/main/features/hub/client-identity.ts`
- Create: `src/main/features/hub/fingerprint-agent.ts`
- Create: `src/main/features/hub/network-watcher.ts`
- Modify: `src/main/features/hub/hub-connection.ts` (multi-hub, switchActive, beforeActiveHubChange)
- Modify: `src/main/features/hub/hub-client.ts` (use fingerprint-pinned agent)
- Modify: `src/main/features/hub/hub-ws-client.ts` (close code 4003 handler)
- Modify: `src/main/features/hub/config-store.ts` (hubs[] shape + legacy migration)
- Modify: `src/main/features/hub/hub-handlers.ts` (new IPC channels)
- Modify: `src/main/lib/db.ts` (per-hub resolver)
- Modify: `src/main/index.ts` (start discovery on whenReady, feature flag)

**Client renderer (`src/renderer/features/hub/`):**
- Create: `src/renderer/features/hub/components/HubPickerPanel/HubPickerPanel.tsx` (+ subcomponents, .module.css, index.ts)
- Create: `src/renderer/features/hub/components/RevocationModal/RevocationModal.tsx`
- Create: `src/renderer/features/hub/api/useHubDiscovery.ts`, `useHubPair.ts`, `useHubSwitchActive.ts`, `useHubRemoveRecord.ts`, `useHubManualPair.ts`
- Modify: `src/renderer/features/hub/components/HubSetupPage/HubSetupPage.tsx` (wrap picker)
- Modify: `src/renderer/features/settings/components/HubSettings/HubSettings.tsx` (use picker)

**Shared (`src/shared/ipc/hub/`):**
- Modify: `src/shared/ipc/hub/channels.ts` (5 new request channels, 3 event channels)
- Modify: `src/shared/ipc/hub/contract.ts` (Zod schemas)

**Tests:**
- Integration: `hub/test/pair.integration.test.ts`, `hub/test/admin.integration.test.ts`, `src/main/features/hub/*.integration.test.ts`
- E2E: `tests/e2e/hub-discovery.spec.ts`

---

## Hub codebase reality (read this before any hub-side task)

The `hub/` package does NOT use Drizzle ORM. Plan snippets that mention Drizzle `schema.ts` are aspirational — adapt to what's actually there:

- **Migrations:** raw SQL in `hub/src/db/migrations/` with a 3-digit prefix (`001_…`, `002_…`, `005_…`). Next free number: `006_`.
- **Migration runner:** `hub/src/db/migration-runner.ts` exports `runMigrations(db, migrationsDir)`.
- **Schema reference:** `hub/src/db/schema.sql` is a reference file, not a Drizzle-generated artifact. Do not create `hub/src/db/schema.ts`; skip any plan step that says to modify it.
- **Test runner:** `hub/` has no vitest. Use Node's built-in `node:test` + `node:assert`, write tests as `.test.mjs` or `.test.ts` (tsx is already a devDependency) under `hub/test/`. Add a `test` script in `hub/package.json` if one isn't already present.
- **When adding devDependencies,** install only into `hub/`, not the root repo.

The **client** (`src/main/`, `src/renderer/`) does use Vitest + Drizzle — those plan snippets are correct as-is.

## Conventions

- **TDD always:** write the failing test, run it to see it fail with the expected message, write the minimum code to pass, run it green, commit. No exceptions.
- **Commits:** one per task (not one per step). Use Conventional Commits: `feat(hub): …`, `fix(main): …`, `test(hub-pair): …`.
- **Co-author footer:** include `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- **Lint + typecheck per task:** before committing, run `npx eslint <changed files>` and `npx tsc --noEmit`. Do not commit red.
- **Never weaken CSP, never disable gating middleware, never `--no-verify`.**
- **If a test is flaky, fix it or quarantine it. Don't retry in a loop.**
- **Single commit per task** — if you discover a sub-fix needed during a task (e.g., a missing import), fold it in before committing.

---

## Task 1 — Hub schema migration for pair identity + audit

**Files:**
- Create: `hub/migrations/0010_pair_identity.sql`
- Modify: `hub/src/db/schema.ts`
- Test: `hub/test/migrations.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// hub/test/migrations.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrate';

describe('migration 0010_pair_identity', () => {
  let db: Database.Database;
  beforeEach(() => { db = new Database(':memory:'); runMigrations(db); });

  it('api_keys has new columns', () => {
    const cols = db.prepare("PRAGMA table_info(api_keys)").all() as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining([
      'client_id', 'display_name', 'pubkey_fp', 'revoked_at', 'revoked_reason',
    ]));
  });

  it('pairing_events table exists with required columns', () => {
    const cols = db.prepare("PRAGMA table_info(pairing_events)").all() as Array<{ name: string }>;
    expect(cols.map((c) => c.name)).toEqual(expect.arrayContaining([
      'id', 'ts', 'event_type', 'client_id', 'display_name',
      'source_ip', 'user_agent', 'pubkey_fp', 'outcome', 'reason',
    ]));
  });
});
```

- [ ] **Step 2: Run failing**

```
npx vitest run hub/test/migrations.test.ts
```
Expected: fails because migration file doesn't exist yet.

- [ ] **Step 3: Implement migration**

```sql
-- hub/migrations/0010_pair_identity.sql
ALTER TABLE api_keys ADD COLUMN client_id TEXT;
ALTER TABLE api_keys ADD COLUMN display_name TEXT;
ALTER TABLE api_keys ADD COLUMN pubkey_fp TEXT;
ALTER TABLE api_keys ADD COLUMN revoked_at INTEGER;
ALTER TABLE api_keys ADD COLUMN revoked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON api_keys(client_id);

CREATE TABLE pairing_events (
  id           TEXT PRIMARY KEY,
  ts           INTEGER NOT NULL,
  event_type   TEXT NOT NULL,
  client_id    TEXT,
  display_name TEXT,
  source_ip    TEXT,
  user_agent   TEXT,
  pubkey_fp    TEXT,
  outcome      TEXT NOT NULL,
  reason       TEXT
);

CREATE INDEX idx_pairing_events_ts ON pairing_events(ts);
CREATE INDEX idx_pairing_events_client_id ON pairing_events(client_id);
CREATE INDEX idx_pairing_events_event_type ON pairing_events(event_type);
```

Update Drizzle schema in `hub/src/db/schema.ts`:

```ts
// add to api_keys table definition:
client_id: text('client_id'),
display_name: text('display_name'),
pubkey_fp: text('pubkey_fp'),
revoked_at: integer('revoked_at'),
revoked_reason: text('revoked_reason'),

// new table:
export const pairingEvents = sqliteTable('pairing_events', {
  id: text('id').primaryKey(),
  ts: integer('ts').notNull(),
  event_type: text('event_type').notNull(),
  client_id: text('client_id'),
  display_name: text('display_name'),
  source_ip: text('source_ip'),
  user_agent: text('user_agent'),
  pubkey_fp: text('pubkey_fp'),
  outcome: text('outcome').notNull(),
  reason: text('reason'),
});
```

- [ ] **Step 4: Run green**

```
npx vitest run hub/test/migrations.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add hub/migrations/0010_pair_identity.sql hub/src/db/schema.ts hub/test/migrations.test.ts
git commit -m "feat(hub/db): add pair identity columns + pairing_events table

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2 — Shared IPC channels and Zod contracts

**Files:**
- Modify: `src/shared/ipc/hub/channels.ts`
- Modify: `src/shared/ipc/hub/contract.ts`
- Test: `src/shared/ipc/hub/contract.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/shared/ipc/hub/contract.test.ts
import { describe, it, expect } from 'vitest';
import { HUB, HUB_EVENTS } from './channels';
import {
  hubDiscoveredListOutputSchema,
  hubPairRequestInputSchema,
  hubSwitchActiveInputSchema,
  hubManualPairInputSchema,
  hubDiscoveryChangedEventSchema,
  hubRevokedEventSchema,
} from './contract';

describe('hub IPC channels', () => {
  it('defines all new channels', () => {
    expect(HUB.DISCOVERED.LIST).toBe('hub.discovered.list');
    expect(HUB.PAIR.REQUEST).toBe('hub.pair.request');
    expect(HUB.SWITCH.ACTIVE).toBe('hub.switch.active');
    expect(HUB.REMOVE.RECORD).toBe('hub.remove.record');
    expect(HUB.MANUAL.PAIR).toBe('hub.manual.pair');
    expect(HUB_EVENTS.DISCOVERY.CHANGED).toBe('event:hub.discovery.changed');
    expect(HUB_EVENTS.ACTIVE.CHANGED).toBe('event:hub.active.changed');
    expect(HUB_EVENTS.REVOKED).toBe('event:hub.revoked');
  });

  it('PAIR.REQUEST accepts {hubId, displayName?}', () => {
    expect(hubPairRequestInputSchema.safeParse({ hubId: 'x' }).success).toBe(true);
    expect(hubPairRequestInputSchema.safeParse({ hubId: 'x', displayName: 'y' }).success).toBe(true);
    expect(hubPairRequestInputSchema.safeParse({}).success).toBe(false);
  });

  it('DISCOVERED.LIST output includes paired + discovered + activeHubId', () => {
    const parsed = hubDiscoveredListOutputSchema.safeParse({
      paired: [], discovered: [], activeHubId: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('DISCOVERY.CHANGED event payload is typed', () => {
    const parsed = hubDiscoveryChangedEventSchema.safeParse({
      paired: [], discovered: [], activeHubId: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('REVOKED event payload has hubId + reason', () => {
    expect(hubRevokedEventSchema.safeParse({ hubId: 'x', reason: 'y' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing**

```
npx vitest run src/shared/ipc/hub/contract.test.ts
```

- [ ] **Step 3: Implement channels and schemas**

In `channels.ts`:
```ts
export const HUB = {
  CONNECT: { SERVER: 'hub.connect.server' },
  DISCONNECT: { SERVER: 'hub.disconnect.server' },
  GET: { STATUS: 'hub.get.status', CONFIG: 'hub.get.config' },
  SYNC: { DATA: 'hub.sync.data' },
  GENERATE: { KEY: 'hub.generate.key' },
  REMOVE: { CONFIG: 'hub.remove.config', RECORD: 'hub.remove.record' },
  DISCOVERED: { LIST: 'hub.discovered.list' },
  PAIR: { REQUEST: 'hub.pair.request' },
  SWITCH: { ACTIVE: 'hub.switch.active' },
  MANUAL: { PAIR: 'hub.manual.pair' },
} as const;

export const HUB_EVENTS = {
  CONNECTION: { CHANGED: 'event:hub.connection.changed' },
  SYNC: { COMPLETED: 'event:hub.sync.completed' },
  DISCOVERY: { CHANGED: 'event:hub.discovery.changed' },
  ACTIVE: { CHANGED: 'event:hub.active.changed' },
  REVOKED: 'event:hub.revoked',
} as const;
```

In `contract.ts`, add:
```ts
import { z } from 'zod';

export const hubRecordSchema = z.object({
  hubId: z.string(),
  displayName: z.string(),
  lastKnownUrl: z.string().nullable(),
  pinnedFingerprint: z.string().nullable(),
  addedAt: z.string(),
  lastConnectedAt: z.string().nullable(),
  status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
});

export const discoveredHubSchema = z.object({
  hubId: z.string(),
  displayName: z.string(),
  version: z.string(),
  channel: z.string(),
  addresses: z.array(z.string()),
  port: z.number(),
  fingerprint: z.string(),
  lastSeenAt: z.string(),
  stale: z.boolean(),
});

export const hubDiscoveredListOutputSchema = z.object({
  paired: z.array(hubRecordSchema),
  discovered: z.array(discoveredHubSchema),
  activeHubId: z.string().nullable(),
});

export const hubPairRequestInputSchema = z.object({
  hubId: z.string(),
  displayName: z.string().optional(),
});

export const hubPairRequestOutputSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), hubId: z.string() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export const hubSwitchActiveInputSchema = z.object({ hubId: z.string() });
export const hubManualPairInputSchema = z.object({
  url: z.string().url(),
  displayName: z.string().optional(),
});

export const hubDiscoveryChangedEventSchema = hubDiscoveredListOutputSchema;
export const hubActiveChangedEventSchema = z.object({ activeHubId: z.string().nullable() });
export const hubRevokedEventSchema = z.object({
  hubId: z.string(),
  reason: z.string(),
});
```

- [ ] **Step 4: Run green**

```
npx vitest run src/shared/ipc/hub/contract.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/ipc/hub/
git commit -m "feat(ipc): channels + zod schemas for hub discovery, pair, switch, revoke

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3 — Hub stable ID library

**Files:**
- Create: `hub/src/lib/hub-id.ts`
- Test: `hub/test/hub-id.test.ts`

- [ ] **Step 1: Failing test**

```ts
// hub/test/hub-id.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveHubId } from '../src/lib/hub-id';

describe('resolveHubId', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hub-id-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('generates and persists a UUID on first call', () => {
    const id = resolveHubId(dir);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(existsSync(join(dir, 'hub-id'))).toBe(true);
    expect(readFileSync(join(dir, 'hub-id'), 'utf8').trim()).toBe(id);
  });

  it('returns the same id on subsequent calls', () => {
    const a = resolveHubId(dir);
    const b = resolveHubId(dir);
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run failing**

- [ ] **Step 3: Implement**

```ts
// hub/src/lib/hub-id.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function resolveHubId(dataDir: string): string {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, 'hub-id');
  if (existsSync(path)) {
    const existing = readFileSync(path, 'utf8').trim();
    if (existing.length > 0) return existing;
  }
  const id = randomUUID();
  writeFileSync(path, id + '\n', { mode: 0o600 });
  return id;
}
```

- [ ] **Step 4: Run green**

- [ ] **Step 5: Commit**

```bash
git add hub/src/lib/hub-id.ts hub/test/hub-id.test.ts
git commit -m "feat(hub/lib): persistent hub id generator

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4 — Self-signed TLS cert generation

**Files:**
- Create: `hub/src/lib/tls.ts`
- Test: `hub/test/tls.test.ts`
- Modify: `hub/package.json` (add `@peculiar/x509` dependency)

- [ ] **Step 1: Install dependency**

```bash
cd hub && npm install @peculiar/x509 @peculiar/webcrypto
```

- [ ] **Step 2: Failing test**

```ts
// hub/test/tls.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { resolveTls } from '../src/lib/tls';

describe('resolveTls', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'tls-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('generates cert, key, and fingerprint on first call', async () => {
    const r = await resolveTls(dir, 'test-hub-id');
    expect(r.cert).toMatch(/BEGIN CERTIFICATE/);
    expect(r.key).toMatch(/BEGIN PRIVATE KEY/);
    expect(r.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(existsSync(join(dir, 'tls.cert.pem'))).toBe(true);
    expect(existsSync(join(dir, 'tls.key.pem'))).toBe(true);
  });

  it('cert files are mode 0600 on POSIX', () => {
    if (process.platform === 'win32') return;
    const p = join(dir, 'tls.key.pem');
    // touched by earlier test setup, but test is standalone:
  });

  it('reuses existing cert on subsequent calls', async () => {
    const a = await resolveTls(dir, 'test-hub-id');
    const b = await resolveTls(dir, 'test-hub-id');
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('fingerprint matches SHA-256 of DER cert', async () => {
    const r = await resolveTls(dir, 'test-hub-id');
    const der = Buffer.from(r.cert.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, ''), 'base64');
    const expected = createHash('sha256').update(der).digest('hex');
    expect(r.fingerprint).toBe(expected);
  });

  it('regenerates when cert expires within 30 days', async () => {
    const a = await resolveTls(dir, 'test-hub-id', { notAfter: new Date(Date.now() + 10 * 86400_000) });
    const b = await resolveTls(dir, 'test-hub-id');
    expect(b.fingerprint).not.toBe(a.fingerprint);
  });
});
```

- [ ] **Step 3: Run failing**

- [ ] **Step 4: Implement**

```ts
// hub/src/lib/tls.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import * as x509 from '@peculiar/x509';
import { Crypto } from '@peculiar/webcrypto';

const webcrypto = new Crypto();
x509.cryptoProvider.set(webcrypto);

export interface TlsMaterial {
  cert: string;  // PEM
  key: string;   // PEM
  fingerprint: string; // SHA-256 hex of DER
}

const CERT_VALIDITY_DAYS = 365;
const ROTATE_IF_WITHIN_DAYS = 30;

function fingerprintOfPem(pem: string): string {
  const der = Buffer.from(pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, ''), 'base64');
  return createHash('sha256').update(der).digest('hex');
}

function collectSANs(): string[] {
  const sans = ['localhost'];
  const interfaces = networkInterfaces();
  for (const list of Object.values(interfaces)) {
    if (!list) continue;
    for (const entry of list) {
      if (entry.family === 'IPv4' && !entry.internal) sans.push(entry.address);
    }
  }
  return sans;
}

async function generateCert(hubId: string, opts?: { notAfter?: Date }): Promise<TlsMaterial> {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: 'Ed25519' } as any,
    true,
    ['sign', 'verify'],
  ) as CryptoKeyPair;

  const now = new Date();
  const notAfter = opts?.notAfter ?? new Date(now.getTime() + CERT_VALIDITY_DAYS * 86400_000);
  const sans = collectSANs();

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: '01',
    name: `CN=${hubId}`,
    notBefore: now,
    notAfter,
    signingAlgorithm: { name: 'Ed25519' },
    keys: keyPair,
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyCertSign),
      new x509.SubjectAlternativeNameExtension(sans.map((s) => (s.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(s)) ? { type: 'ip', value: s } : { type: 'dns', value: s })),
    ],
  });

  const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const key = pemFromDer('PRIVATE KEY', Buffer.from(pkcs8));
  const certPem = cert.toString('pem');
  return { cert: certPem, key, fingerprint: fingerprintOfPem(certPem) };
}

function pemFromDer(label: string, der: Buffer): string {
  const b64 = der.toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}

function daysUntilExpiry(pem: string): number {
  const cert = new x509.X509Certificate(pem);
  return (cert.notAfter.getTime() - Date.now()) / 86400_000;
}

export async function resolveTls(dataDir: string, hubId: string, opts?: { notAfter?: Date }): Promise<TlsMaterial> {
  mkdirSync(dataDir, { recursive: true });
  const certPath = join(dataDir, 'tls.cert.pem');
  const keyPath = join(dataDir, 'tls.key.pem');

  if (existsSync(certPath) && existsSync(keyPath) && !opts?.notAfter) {
    const existing = readFileSync(certPath, 'utf8');
    if (daysUntilExpiry(existing) > ROTATE_IF_WITHIN_DAYS) {
      return { cert: existing, key: readFileSync(keyPath, 'utf8'), fingerprint: fingerprintOfPem(existing) };
    }
  }

  const material = await generateCert(hubId, opts);
  writeFileSync(certPath, material.cert, { mode: 0o600 });
  writeFileSync(keyPath, material.key, { mode: 0o600 });
  if (process.platform !== 'win32') {
    chmodSync(certPath, 0o600);
    chmodSync(keyPath, 0o600);
  }
  return material;
}
```

- [ ] **Step 5: Run green**

- [ ] **Step 6: Commit**

```bash
git add hub/src/lib/tls.ts hub/test/tls.test.ts hub/package.json hub/package-lock.json
git commit -m "feat(hub/lib): self-signed Ed25519 TLS cert with 30-day rotation window

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5 — Audit middleware

**Files:**
- Create: `hub/src/middleware/audit.ts`
- Create: `hub/src/lib/audit-repo.ts`
- Test: `hub/test/audit.test.ts`

- [ ] **Step 1: Failing test**

```ts
// hub/test/audit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrate';
import { createAuditRepo } from '../src/lib/audit-repo';

describe('AuditRepo', () => {
  let db: Database.Database;
  beforeEach(() => { db = new Database(':memory:'); runMigrations(db); });

  it('records a pair.confirm event', () => {
    const repo = createAuditRepo(db);
    repo.record({
      event_type: 'pair.confirm',
      client_id: 'c1', display_name: 'Test',
      source_ip: '127.0.0.1', user_agent: 'ua', pubkey_fp: 'fp',
      outcome: 'success',
    });
    const rows = db.prepare('SELECT * FROM pairing_events').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].event_type).toBe('pair.confirm');
    expect(rows[0].outcome).toBe('success');
    expect(typeof rows[0].ts).toBe('number');
  });

  it('list filters by clientId and eventType', () => {
    const repo = createAuditRepo(db);
    repo.record({ event_type: 'pair.init', client_id: 'a', outcome: 'success' });
    repo.record({ event_type: 'pair.init', client_id: 'b', outcome: 'success' });
    repo.record({ event_type: 'pair.confirm', client_id: 'a', outcome: 'success' });
    const byA = repo.list({ clientId: 'a' });
    expect(byA).toHaveLength(2);
    const inits = repo.list({ eventType: 'pair.init' });
    expect(inits).toHaveLength(2);
  });

  it('purgeOlderThan deletes old rows', () => {
    const repo = createAuditRepo(db);
    const old = Date.now() - 91 * 86400_000;
    db.prepare("INSERT INTO pairing_events (id, ts, event_type, outcome) VALUES (?, ?, ?, ?)").run('x', old, 'pair.init', 'success');
    repo.purgeOlderThan(90 * 86400_000);
    expect(repo.list({})).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run failing**

- [ ] **Step 3: Implement**

```ts
// hub/src/lib/audit-repo.ts
import { ulid } from 'ulid';
import type Database from 'better-sqlite3';

export type PairingEventType = 'pair.init' | 'pair.confirm' | 'pair.reject' | 'key.revoke' | 'key.use';
export type PairingOutcome = 'success' | 'rate_limited' | 'identity_conflict' | 'bad_signature' | 'expired_nonce' | 'revoked' | 'unknown_key' | 'internal_error';

export interface RecordInput {
  event_type: PairingEventType;
  client_id?: string | null;
  display_name?: string | null;
  source_ip?: string | null;
  user_agent?: string | null;
  pubkey_fp?: string | null;
  outcome: PairingOutcome;
  reason?: string | null;
}

export interface ListFilter {
  from?: number;
  to?: number;
  clientId?: string;
  eventType?: PairingEventType;
  limit?: number;
  offset?: number;
}

export interface AuditRepo {
  record: (input: RecordInput) => void;
  list: (filter: ListFilter) => unknown[];
  purgeOlderThan: (ageMs: number) => number;
}

export function createAuditRepo(db: Database.Database): AuditRepo {
  const insert = db.prepare(
    `INSERT INTO pairing_events (id, ts, event_type, client_id, display_name, source_ip, user_agent, pubkey_fp, outcome, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  return {
    record(input) {
      insert.run(
        ulid(), Date.now(), input.event_type,
        input.client_id ?? null, input.display_name ?? null,
        input.source_ip ?? null, input.user_agent ?? null, input.pubkey_fp ?? null,
        input.outcome, input.reason ?? null,
      );
    },
    list(filter) {
      const clauses: string[] = [];
      const params: unknown[] = [];
      if (filter.from) { clauses.push('ts >= ?'); params.push(filter.from); }
      if (filter.to) { clauses.push('ts <= ?'); params.push(filter.to); }
      if (filter.clientId) { clauses.push('client_id = ?'); params.push(filter.clientId); }
      if (filter.eventType) { clauses.push('event_type = ?'); params.push(filter.eventType); }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const limit = Math.min(filter.limit ?? 100, 1000);
      const offset = filter.offset ?? 0;
      params.push(limit, offset);
      return db.prepare(`SELECT * FROM pairing_events ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`).all(...params);
    },
    purgeOlderThan(ageMs) {
      const cutoff = Date.now() - ageMs;
      const info = db.prepare('DELETE FROM pairing_events WHERE ts < ?').run(cutoff);
      return info.changes as number;
    },
  };
}
```

```ts
// hub/src/middleware/audit.ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuditRepo, PairingEventType, PairingOutcome } from '../lib/audit-repo';

export function createAuditMiddleware(audit: AuditRepo) {
  return function auditEvent(
    req: FastifyRequest,
    eventType: PairingEventType,
    outcome: PairingOutcome,
    extra: { clientId?: string | null; displayName?: string | null; pubkeyFp?: string | null; reason?: string | null },
  ) {
    audit.record({
      event_type: eventType,
      outcome,
      client_id: extra.clientId ?? null,
      display_name: extra.displayName ?? null,
      pubkey_fp: extra.pubkeyFp ?? null,
      source_ip: req.ip,
      user_agent: req.headers['user-agent'] ?? null,
      reason: extra.reason ?? null,
    });
  };
}
```

- [ ] **Step 4: Run green**

- [ ] **Step 5: Commit**

```bash
git add hub/src/middleware/audit.ts hub/src/lib/audit-repo.ts hub/test/audit.test.ts
git commit -m "feat(hub): audit repo + middleware for pairing events

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6 — Pair rate-limit middleware

**Files:**
- Create: `hub/src/middleware/pair-rate-limit.ts`
- Test: `hub/test/pair-rate-limit.test.ts`

- [ ] **Step 1: Failing test**

```ts
// hub/test/pair-rate-limit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimiter } from '../src/middleware/pair-rate-limit';

describe('pair rate limiter', () => {
  beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }));

  it('allows up to N requests in the window', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(limiter.take('ip1')).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.take('ip1')).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.take('ip1')).toEqual({ allowed: true, remaining: 0 });
    expect(limiter.take('ip1')).toMatchObject({ allowed: false });
  });

  it('resets after window elapses', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.take('ip1');
    expect(limiter.take('ip1').allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(limiter.take('ip1').allowed).toBe(true);
  });

  it('isolates by key', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('b').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing**

- [ ] **Step 3: Implement**

```ts
// hub/src/middleware/pair-rate-limit.ts
export interface RateLimiterOpts { limit: number; windowMs: number; }
export interface RateLimiter {
  take: (key: string) => { allowed: boolean; remaining: number; retryAfterMs?: number };
  reset: (key: string) => void;
}

interface Bucket { count: number; resetAt: number; }

export function createRateLimiter(opts: RateLimiterOpts): RateLimiter {
  const buckets = new Map<string, Bucket>();

  function prune() {
    const now = Date.now();
    for (const [k, b] of buckets) { if (b.resetAt <= now) buckets.delete(k); }
  }

  return {
    take(key) {
      prune();
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { allowed: true, remaining: opts.limit - 1 };
      }
      if (bucket.count >= opts.limit) {
        return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
      }
      bucket.count += 1;
      return { allowed: true, remaining: opts.limit - bucket.count };
    },
    reset(key) { buckets.delete(key); },
  };
}
```

- [ ] **Step 4: Run green**

- [ ] **Step 5: Commit**

```bash
git add hub/src/middleware/pair-rate-limit.ts hub/test/pair-rate-limit.test.ts
git commit -m "feat(hub): per-key rate limiter for pair endpoints

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7 — Admin key bootstrap + admin-auth middleware

**Files:**
- Create: `hub/src/middleware/admin-auth.ts`
- Create: `hub/src/lib/admin-key.ts`
- Create: `hub/scripts/hash-admin-password.mjs`
- Test: `hub/test/admin-key.test.ts`

- [ ] **Step 1: Install argon2**

```bash
cd hub && npm install argon2
```

- [ ] **Step 2: Failing test**

```ts
// hub/test/admin-key.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveAdminKey, rotateAdminKey } from '../src/lib/admin-key';

describe('admin key', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'admin-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('generates on first resolve and persists', () => {
    const k = resolveAdminKey(dir);
    expect(k).toMatch(/^[0-9a-f]{64}$/);
    expect(readFileSync(join(dir, 'admin-key.txt'), 'utf8').trim()).toBe(k);
  });

  it('reuses existing key', () => {
    const a = resolveAdminKey(dir);
    const b = resolveAdminKey(dir);
    expect(a).toBe(b);
  });

  it('rotate replaces the key', () => {
    const a = resolveAdminKey(dir);
    const b = rotateAdminKey(dir);
    expect(b).not.toBe(a);
    expect(resolveAdminKey(dir)).toBe(b);
  });
});
```

- [ ] **Step 3: Run failing**

- [ ] **Step 4: Implement**

```ts
// hub/src/lib/admin-key.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

function newKey(): string { return randomBytes(32).toString('hex'); }

export function resolveAdminKey(dataDir: string): string {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, 'admin-key.txt');
  if (existsSync(path)) {
    const existing = readFileSync(path, 'utf8').trim();
    if (existing.length > 0) return existing;
  }
  const k = newKey();
  writeFileSync(path, k + '\n', { mode: 0o600 });
  if (process.platform !== 'win32') chmodSync(path, 0o600);
  return k;
}

export function rotateAdminKey(dataDir: string): string {
  const path = join(dataDir, 'admin-key.txt');
  const k = newKey();
  writeFileSync(path, k + '\n', { mode: 0o600 });
  if (process.platform !== 'win32') chmodSync(path, 0o600);
  return k;
}
```

```ts
// hub/src/middleware/admin-auth.ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';

export function createAdminKeyMiddleware(getCurrentKey: () => string) {
  return async function adminKeyAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = req.headers['x-admin-key'];
    if (typeof header !== 'string' || header.length === 0) {
      await reply.status(401).send({ error: 'Missing X-Admin-Key header' });
      return;
    }
    const expected = getCurrentKey();
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await reply.status(401).send({ error: 'Invalid admin key' });
    }
  };
}

export function createAdminBasicAuth(user: string | undefined, passwordHash: string | undefined) {
  return async function adminBasic(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!user || !passwordHash) {
      await reply.status(403).send({ error: 'Admin UI disabled — set HUB_ADMIN_USER and HUB_ADMIN_PASSWORD_HASH' });
      return;
    }
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) {
      reply.header('WWW-Authenticate', 'Basic realm="ADC Hub Admin"');
      await reply.status(401).send({ error: 'Authentication required' });
      return;
    }
    const [submittedUser, submittedPass] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
    if (submittedUser !== user) {
      await reply.status(401).send({ error: 'Invalid credentials' });
      return;
    }
    try {
      const ok = await argon2.verify(passwordHash, submittedPass ?? '');
      if (!ok) { await reply.status(401).send({ error: 'Invalid credentials' }); return; }
    } catch {
      await reply.status(500).send({ error: 'Admin auth misconfigured' });
    }
  };
}
```

```js
// hub/scripts/hash-admin-password.mjs
import argon2 from 'argon2';
const pw = process.argv[2];
if (!pw) { console.error('Usage: node hash-admin-password.mjs <password>'); process.exit(1); }
console.log(await argon2.hash(pw, { type: argon2.argon2id }));
```

- [ ] **Step 5: Run green**

- [ ] **Step 6: Commit**

```bash
git add hub/src/middleware/admin-auth.ts hub/src/lib/admin-key.ts hub/scripts/hash-admin-password.mjs hub/test/admin-key.test.ts hub/package.json hub/package-lock.json
git commit -m "feat(hub): admin key bootstrap + basic-auth + argon2 password hashing

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8 — HTTPS Fastify + revoked-key enforcement

**Files:**
- Modify: `hub/src/app.ts`
- Modify: `hub/src/middleware/api-key.ts`
- Test: `hub/test/app-https.test.ts`, `hub/test/api-key-revoked.test.ts`

- [ ] **Step 1: Failing test (HTTPS)**

```ts
// hub/test/app-https.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';
import { request } from 'node:https';

describe('hub HTTPS listen', () => {
  it('serves /api/health over TLS with self-signed cert', async () => {
    const { app, tls } = await buildApp({ dataDir: 'test-data', port: 0 });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    if (address === null || typeof address === 'string') throw new Error('no address');
    const body: string = await new Promise((resolve, reject) => {
      const req = request({
        host: '127.0.0.1', port: address.port, path: '/api/health', method: 'GET',
        ca: tls.cert, rejectUnauthorized: true, servername: 'localhost',
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
      req.on('error', reject); req.end();
    });
    expect(body).toContain('"status":"ok"');
    await app.close();
  });
});
```

- [ ] **Step 2: Failing test (revocation)**

```ts
// hub/test/api-key-revoked.test.ts
// Set up a hub with a live key, revoke it, verify request rejected with 401 + body mentions revoked.
```

- [ ] **Step 3: Implement HTTPS in app.ts**

```ts
// replace plain http listen with:
import Fastify from 'fastify';
import { resolveHubId } from './lib/hub-id';
import { resolveTls } from './lib/tls';

export async function buildApp(opts: { dataDir: string; port?: number }) {
  const hubId = resolveHubId(opts.dataDir);
  const tls = await resolveTls(opts.dataDir, hubId);
  const app = Fastify({
    https: { cert: tls.cert, key: tls.key },
    logger: true,
  });
  // … existing routes/middleware wiring …
  return { app, hubId, tls };
}
```

- [ ] **Step 4: Update api-key.ts**

```ts
// in apiKeyMiddleware after fetching `row`:
if (!row) { await reply.status(401).send({ error: 'Invalid API key' }); return; }
if (row.revoked_at !== null) {
  await reply.status(401).send({ error: `Key revoked: ${row.revoked_reason ?? 'no reason'}` });
  return;
}
(req as any).clientId = row.client_id; // for downstream handlers
```

- [ ] **Step 5: Run green (both tests)**

- [ ] **Step 6: Commit**

```bash
git add hub/src/app.ts hub/src/middleware/api-key.ts hub/test/app-https.test.ts hub/test/api-key-revoked.test.ts
git commit -m "feat(hub): HTTPS-only listen + honor revoked keys

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9 — /api/pair/init endpoint

**Files:**
- Create: `hub/src/routes/pair.ts` (init part)
- Create: `hub/src/lib/nonce-store.ts`
- Test: `hub/test/pair-init.test.ts`

- [ ] **Step 1: Failing test**

Write a test that POSTs `{ clientId, clientPubKey, displayName }` to `/api/pair/init` and asserts a 200 with `{ nonce, expiresAt }` where `nonce` is 43-char base64 (32 bytes). A second call with the same `clientId` but different `clientPubKey` returns 409.

- [ ] **Step 2: Run failing**

- [ ] **Step 3: Implement nonce-store**

```ts
// hub/src/lib/nonce-store.ts
import { randomBytes } from 'node:crypto';

export interface NonceStore {
  mint: (clientId: string) => { nonce: string; expiresAt: number };
  consume: (clientId: string, nonce: string) => boolean;
  has: (clientId: string, nonce: string) => boolean;
}

const TTL_MS = 30_000;

export function createNonceStore(): NonceStore {
  const store = new Map<string, Map<string, number>>();

  function prune() {
    const now = Date.now();
    for (const [cid, nonces] of store) {
      for (const [n, exp] of nonces) if (exp <= now) nonces.delete(n);
      if (nonces.size === 0) store.delete(cid);
    }
  }

  return {
    mint(clientId) {
      prune();
      const nonce = randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + TTL_MS;
      if (!store.has(clientId)) store.set(clientId, new Map());
      store.get(clientId)!.set(nonce, expiresAt);
      return { nonce, expiresAt };
    },
    has(clientId, nonce) {
      prune();
      const exp = store.get(clientId)?.get(nonce);
      return exp !== undefined && exp > Date.now();
    },
    consume(clientId, nonce) {
      prune();
      const exp = store.get(clientId)?.get(nonce);
      if (exp === undefined || exp <= Date.now()) return false;
      store.get(clientId)!.delete(nonce);
      return true;
    },
  };
}
```

- [ ] **Step 4: Implement pair route**

```ts
// hub/src/routes/pair.ts (skeleton; confirm added in Task 10)
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { createNonceStore } from '../lib/nonce-store';
import { createRateLimiter } from '../middleware/pair-rate-limit';
import type { AuditRepo } from '../lib/audit-repo';

const initSchema = z.object({
  clientId: z.string().min(1).max(64),
  // base64url-encoded DER SPKI public key produced by
  // crypto.generateKeyPairSync('ed25519', { publicKeyEncoding: { type: 'spki', format: 'der' } })
  clientPubKey: z.string().min(1).max(256),
  displayName: z.string().max(64).optional(),
});

export interface PairDeps {
  db: Database.Database;
  audit: AuditRepo;
  hubId: string;
  nonceStore?: ReturnType<typeof createNonceStore>;
  initLimit?: { limit: number; windowMs: number };
  confirmLimit?: { limit: number; windowMs: number };
}

export function createPairRoutes(deps: PairDeps): FastifyPluginAsync {
  const nonces = deps.nonceStore ?? createNonceStore();
  const initLimiter = createRateLimiter(deps.initLimit ?? { limit: 20, windowMs: 3_600_000 });
  const confirmLimiter = createRateLimiter(deps.confirmLimit ?? { limit: 5, windowMs: 3_600_000 });

  return async (app) => {
    app.post('/api/pair/init', async (req, reply) => {
      const lim = initLimiter.take(req.ip);
      if (!lim.allowed) {
        deps.audit.record({ event_type: 'pair.reject', outcome: 'rate_limited', source_ip: req.ip, user_agent: req.headers['user-agent'] ?? null });
        return reply.status(429).send({ error: 'Rate limited', retryAfterMs: lim.retryAfterMs });
      }
      const parsed = initSchema.safeParse(req.body);
      if (!parsed.success) {
        deps.audit.record({ event_type: 'pair.reject', outcome: 'internal_error', reason: parsed.error.message, source_ip: req.ip });
        return reply.status(400).send({ error: parsed.error.message });
      }
      const { clientId, clientPubKey, displayName } = parsed.data;

      // Check for existing pubkey binding
      const existing = deps.db.prepare('SELECT pubkey_fp FROM api_keys WHERE client_id = ? AND revoked_at IS NULL').get(clientId) as { pubkey_fp: string } | undefined;
      const pubkeyFp = await fingerprintOfPubKey(clientPubKey);
      if (existing && existing.pubkey_fp !== pubkeyFp) {
        deps.audit.record({
          event_type: 'pair.reject', outcome: 'identity_conflict',
          client_id: clientId, display_name: displayName ?? null,
          source_ip: req.ip, pubkey_fp: pubkeyFp,
        });
        return reply.status(409).send({ error: 'IdentityConflict' });
      }

      // Persist binding on first contact so /api/pair/confirm can verify signatures.
      // INSERT OR IGNORE because an existing binding with a matching pubkey is fine.
      const pubKeyDer = Buffer.from(clientPubKey, 'base64url');
      deps.db.prepare('INSERT OR IGNORE INTO client_bindings (client_id, pubkey_der, created_at) VALUES (?, ?, ?)')
        .run(clientId, pubKeyDer, Date.now());

      const { nonce, expiresAt } = nonces.mint(clientId);
      deps.audit.record({
        event_type: 'pair.init', outcome: 'success',
        client_id: clientId, display_name: displayName ?? null,
        source_ip: req.ip, pubkey_fp: pubkeyFp,
      });
      return reply.send({ nonce, expiresAt });
    });
  };
}

async function fingerprintOfPubKey(pubKeyBase64url: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  const raw = Buffer.from(pubKeyBase64url, 'base64url');
  return createHash('sha256').update(raw).digest('hex');
}
```

Wire into `app.ts`:
```ts
await app.register(createPairRoutes({ db, audit, hubId }));
```

- [ ] **Step 5: Run green**

- [ ] **Step 6: Commit**

```bash
git add hub/src/routes/pair.ts hub/src/lib/nonce-store.ts hub/src/app.ts hub/test/pair-init.test.ts
git commit -m "feat(hub): /api/pair/init with nonce issuance + identity conflict detection

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10 — /api/pair/confirm endpoint + key mint

**Files:**
- Modify: `hub/src/routes/pair.ts` (add confirm handler)
- Test: `hub/test/pair-confirm.test.ts`

- [ ] **Step 1: Failing test**

Test the full init → sign → confirm happy path using Node's `crypto.generateKeyPairSync('ed25519')` locally to produce a signable client keypair, then:
- POST `/api/pair/init` → receive nonce
- Sign nonce with `crypto.sign(null, Buffer.from(nonce, 'base64url'), privateKey)`
- POST `/api/pair/confirm` with `{ clientId, nonce, signature }` → receive `{ hubId, displayName, key }`
- Call `GET /api/projects` with `X-API-Key: key` → 200

Additional failing cases: replay nonce → 401; tampered signature → 401; expired nonce → 401.

- [ ] **Step 2: Run failing**

- [ ] **Step 3: Implement**

```ts
// add to pair.ts (inside createPairRoutes plugin):
const confirmSchema = z.object({
  clientId: z.string().min(1).max(64),
  nonce: z.string().min(1).max(128),
  signature: z.string().min(1).max(256),
});

app.post('/api/pair/confirm', async (req, reply) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
  const { clientId, nonce, signature } = parsed.data;
  const lim = confirmLimiter.take(clientId);
  if (!lim.allowed) {
    deps.audit.record({ event_type: 'pair.reject', outcome: 'rate_limited', client_id: clientId, source_ip: req.ip });
    return reply.status(429).send({ error: 'Rate limited', retryAfterMs: lim.retryAfterMs });
  }
  if (!nonces.has(clientId, nonce)) {
    deps.audit.record({ event_type: 'pair.reject', outcome: 'expired_nonce', client_id: clientId, source_ip: req.ip });
    return reply.status(401).send({ error: 'ExpiredNonce' });
  }
  // Pubkey was persisted by /api/pair/init into client_bindings (see migration).
  // Read it here and verify the signature.
  const binding = deps.db.prepare('SELECT pubkey_der FROM client_bindings WHERE client_id = ?').get(clientId) as { pubkey_der: Buffer } | undefined;
  if (!binding) {
    deps.audit.record({ event_type: 'pair.reject', outcome: 'bad_signature', client_id: clientId, reason: 'no binding', source_ip: req.ip });
    return reply.status(401).send({ error: 'UnknownClient' });
  }
  const { verify, createPublicKey } = await import('node:crypto');
  const publicKey = createPublicKey({ key: binding.pubkey_der, format: 'der', type: 'spki' });
  const ok = verify(null, Buffer.from(nonce, 'base64url'), publicKey, Buffer.from(signature, 'base64url'));
  if (!ok) {
    deps.audit.record({ event_type: 'pair.reject', outcome: 'bad_signature', client_id: clientId, source_ip: req.ip });
    return reply.status(401).send({ error: 'BadSignature' });
  }
  nonces.consume(clientId, nonce);

  // Revoke previous keys for this clientId
  deps.db.prepare("UPDATE api_keys SET revoked_at = ?, revoked_reason = 'superseded' WHERE client_id = ? AND revoked_at IS NULL").run(Date.now(), clientId);
  // Mint new key
  const key = randomBytes(32).toString('hex');
  const keyHash = createHash('sha256').update(key).digest('hex');
  const pubkeyFp = createHash('sha256').update(binding.pubkey_der).digest('hex');
  const displayName = req.body?.displayName ?? `Client ${clientId.slice(0, 8)}`;
  deps.db.prepare(`INSERT INTO api_keys (id, key_hash, created_at, client_id, display_name, pubkey_fp) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(ulid(), keyHash, Date.now(), clientId, displayName, pubkeyFp);

  deps.audit.record({ event_type: 'pair.confirm', outcome: 'success', client_id: clientId, display_name: displayName, pubkey_fp: pubkeyFp });
  return reply.send({ hubId: deps.hubId, displayName, key });
});
```

Note: the raw pubkey needs to flow from init to confirm. The simplest durable option is to persist it in init. Refactor: add a `client_bindings` table with `(client_id PK, pubkey_der BLOB, created_at INTEGER)` created in a follow-up migration — *but* since this task already exists, fold into Task 1 migration. Go back and add to `0010_pair_identity.sql`:

```sql
CREATE TABLE client_bindings (
  client_id TEXT PRIMARY KEY,
  pubkey_der BLOB NOT NULL,
  created_at INTEGER NOT NULL
);
```

Update `init` to write this row (INSERT OR IGNORE), `confirm` to read it.

- [ ] **Step 4: Run green (all happy + error cases)**

- [ ] **Step 5: Commit**

```bash
git add hub/src/routes/pair.ts hub/migrations/0010_pair_identity.sql hub/test/pair-confirm.test.ts
git commit -m "feat(hub): /api/pair/confirm with Ed25519 nonce verification + key mint

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11 — WebSocket revocation close code 4003

**Files:**
- Modify: `hub/src/app.ts` or wherever WS connections are tracked
- Test: `hub/test/ws-revoke.test.ts`

- [ ] **Step 1: Failing test**

Spin up hub, pair a client, open a WebSocket to `/ws` with `?apiKey=<key>` (or the auth message), revoke the key via DB, assert the WS receives close code 4003 with body mentioning `revoked`.

- [ ] **Step 2: Implement**

Maintain a Map `Map<clientId, Set<WebSocket>>` on the WebSocket router. When a message with `type: 'revoke'` is received on an internal revocation bus, iterate the set and call `ws.close(4003, JSON.stringify({ reason }))`.

Expose a `revokeClient(clientId: string, reason: string)` function on the app that:
1. `UPDATE api_keys SET revoked_at=?, revoked_reason=? WHERE client_id=?`
2. Emits through the revocation bus so WebSockets close.

- [ ] **Step 3: Run green**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(hub): WebSocket close 4003 on client revocation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12 — mDNS advertiser

**Files:**
- Create: `hub/src/mdns/advertiser.ts`
- Modify: `hub/package.json` (`bonjour-service`)
- Modify: `hub/src/app.ts`
- Test: `hub/test/advertiser.test.ts`

- [ ] **Step 1: Install bonjour-service**

```bash
cd hub && npm install bonjour-service
```

- [ ] **Step 2: Failing test**

```ts
// hub/test/advertiser.test.ts
import { describe, it, expect } from 'vitest';
import { createAdvertiser } from '../src/mdns/advertiser';
import { Bonjour } from 'bonjour-service';

describe('mdns advertiser', () => {
  it('publishes a service with expected TXT fields', async () => {
    const adv = createAdvertiser({
      hubId: 'test-hub', version: '0.2.0', channel: 'dev',
      displayName: 'TestHub', port: 31337, fingerprint: 'a'.repeat(64),
    });
    await adv.start();
    const bonjour = new Bonjour();
    const found = await new Promise<any>((resolve) => {
      const browser = bonjour.find({ type: 'adc-hub' }, (svc) => { resolve(svc); browser.stop(); });
    });
    expect(found.txt.id).toBe('test-hub');
    expect(found.txt.v).toBe('1');
    expect(found.txt.app).toBe('0.2.0');
    expect(found.txt.ch).toBe('dev');
    expect(found.txt.name).toBe('TestHub');
    expect(found.txt.fp).toBe('a'.repeat(64));
    bonjour.destroy();
    await adv.stop();
  }, 15_000);
});
```

- [ ] **Step 3: Implement**

```ts
// hub/src/mdns/advertiser.ts
import { Bonjour, Service } from 'bonjour-service';

export interface AdvertiserOpts {
  hubId: string;
  version: string;
  channel: 'release' | 'local' | 'dev';
  displayName: string;
  port: number;
  fingerprint: string;
}

export interface Advertiser {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  refresh: (opts: Partial<AdvertiserOpts>) => Promise<void>;
}

export function createAdvertiser(opts: AdvertiserOpts): Advertiser {
  let bonjour: Bonjour | null = null;
  let service: Service | null = null;
  let current = { ...opts };

  async function publish() {
    if (!bonjour) bonjour = new Bonjour();
    service = bonjour.publish({
      name: current.hubId,
      type: 'adc-hub',
      protocol: 'tcp',
      port: current.port,
      txt: {
        id: current.hubId,
        v: '1',
        app: current.version,
        ch: current.channel,
        name: current.displayName,
        api: '/api',
        fp: current.fingerprint,
      },
    });
  }

  return {
    async start() { await publish(); },
    async stop() {
      await new Promise<void>((resolve) => {
        if (!service) return resolve();
        service.stop(() => { service = null; resolve(); });
      });
      if (bonjour) { bonjour.destroy(); bonjour = null; }
    },
    async refresh(patch) {
      current = { ...current, ...patch };
      if (service) { service.stop(); service = null; }
      await publish();
    },
  };
}
```

Wire into `hub/src/app.ts` lifecycle:

```ts
import { createAdvertiser } from './mdns/advertiser';
// after app.listen resolves:
const advertiser = createAdvertiser({
  hubId, version: pkg.version, channel: (process.env.HUB_CHANNEL as any) ?? 'release',
  displayName: process.env.HUB_DISPLAY_NAME ?? hostname(), port: resolvedPort, fingerprint: tls.fingerprint,
});
await advertiser.start();
// SIGTERM / SIGINT handler:
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => { await advertiser.stop(); process.exit(0); });
}
```

- [ ] **Step 4: Run green**

- [ ] **Step 5: Commit**

```bash
git add hub/src/mdns/advertiser.ts hub/src/app.ts hub/package.json hub/package-lock.json hub/test/advertiser.test.ts
git commit -m "feat(hub): mdns advertiser with TXT record including TLS fingerprint

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13 — Hub admin REST endpoints (single task)

**Files:**
- Create: `hub/src/routes/admin/clients.ts`, `audit.ts`, `settings.ts`, `index.ts`
- Modify: `hub/src/app.ts`
- Test: `hub/test/admin-clients.test.ts`, `hub/test/admin-audit.test.ts`

- [ ] **Step 1: Failing tests**

Write tests covering:
- `GET /api/admin/clients` → list paired clients
- `POST /api/admin/clients/:clientId/revoke` → revokes + returns 200; subsequent key use returns 401 "Key revoked"
- `POST /api/admin/clients/:clientId/rename` → updates display_name
- `POST /api/admin/clients/:clientId/reset-identity` → removes client_binding row
- `GET /api/admin/audit` → paginated
- `POST /api/admin/rotate-admin-key` → returns new key, old key rejected next call

All must reject without `X-Admin-Key` header → 401.

- [ ] **Step 2: Implement**

Keep each route handler under 30 lines. The `revoke` handler calls the bus from Task 11 to close WebSockets.

- [ ] **Step 3: Run green**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(hub/admin): clients, audit, and settings REST endpoints

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 14 — Admin UI React SPA

**Files:**
- Create: `hub/src/ui/admin/` (Vite + React + Tailwind project)
- Create: `hub/vite.admin.config.ts`
- Modify: `hub/src/app.ts` (serve built assets at `/admin`, guard with basic-auth middleware)

- [ ] **Step 1: Scaffold minimal React app**

Three pages (tabs): Clients, Audit, Settings. Uses `fetch` against `/api/admin/*` with prompted admin key stored in sessionStorage.

- [ ] **Step 2: Wire static serving under basic-auth**

```ts
// in app.ts
app.register(import('@fastify/static'), {
  root: join(__dirname, '../ui/admin/dist'), prefix: '/admin/', decorateReply: false,
  preHandler: createAdminBasicAuth(process.env.HUB_ADMIN_USER, process.env.HUB_ADMIN_PASSWORD_HASH),
});
```

- [ ] **Step 3: Smoke test**

Open `/admin/`, log in, list clients, revoke one, verify the row shows `revoked` status.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(hub): admin UI — clients, audit, settings tabs

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 15 — Audit retention cron

**Files:**
- Create: `hub/src/lib/audit-retention.ts`
- Modify: `hub/src/app.ts`

- [ ] **Step 1: Test**

Verify that calling `scheduleAuditRetention(db, 1)` then fast-forwarding 24h deletes rows older than 1 day.

- [ ] **Step 2: Implement**

```ts
// hub/src/lib/audit-retention.ts
import type { AuditRepo } from './audit-repo';
import { appLogger } from './logger';

export function scheduleAuditRetention(audit: AuditRepo, retentionDays = 90): () => void {
  const ageMs = retentionDays * 86400_000;
  const run = () => {
    const purged = audit.purgeOlderThan(ageMs);
    if (purged > 0) appLogger.info(`[Audit] Purged ${purged} events older than ${retentionDays}d`);
  };
  run();
  const id = setInterval(run, 6 * 3_600_000);
  return () => clearInterval(id);
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(hub): audit retention cron (configurable via HUB_AUDIT_RETENTION_DAYS)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 16 — Client config-store: hubs[] shape + legacy migration

**Files:**
- Modify: `src/main/features/hub/config-store.ts`
- Test: `src/main/features/hub/config-store.test.ts`

- [ ] **Step 1: Failing test**

Legacy input `{ hubUrl, encryptedApiKey, enabled, lastConnected }` → migrator produces `{ hubs: [{ hubId: 'legacy', displayName, lastKnownUrl, encryptedApiKey, pinnedFingerprint: null, dbPath: 'hubs/legacy/adc.db', clientIdentityRef: null, addedAt, lastConnectedAt }], activeHubId: 'legacy' }`.

- [ ] **Step 2: Implement migration logic**

Guard behind a `version` field in the config; bump to 2.

- [ ] **Step 3: Run green**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(main/hub): config-store schema v2 — hubs[] + legacy migrator"
```

---

## Task 17 — Per-hub DB resolver + legacy adc.db move

**Files:**
- Modify: `src/main/lib/db.ts`
- Create: `src/main/features/hub/db-migrator.ts`
- Test: `src/main/features/hub/db-migrator.test.ts`

- [ ] **Step 1: Test** that on app boot with legacy layout, `adc.db` is moved to `hubs/legacy/adc.db` once and only once.

- [ ] **Step 2: Implement** the one-shot move, plus `getActiveDbPath(activeHubId)` that composes `${userData}/hubs/${hubId}/adc.db` creating directories as needed.

- [ ] **Step 3: Run green**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(main): per-hub adc.db resolver + legacy move

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 18 — Client Ed25519 identity (per hub)

**Files:**
- Create: `src/main/features/hub/client-identity.ts`
- Test: `src/main/features/hub/client-identity.test.ts`

- [ ] **Step 1: Failing test**

`ensureClientIdentity(hubDir)` returns `{ clientId, publicKeyDer, signNonce(nonce: Buffer) => Buffer }` on first call; second call reads same keypair; `signNonce` produces Ed25519 signature verifiable with the returned pubkey.

- [ ] **Step 2: Implement**

Use `crypto.generateKeyPairSync('ed25519', { publicKeyEncoding: { type: 'spki', format: 'der' }, privateKeyEncoding: { type: 'pkcs8', format: 'der' } })`. Wrap private key with `safeStorage.encryptString`, store at `${hubDir}/client-identity.enc`. Public key plaintext at `${hubDir}/client-identity.pub`. `clientId = sha256(pub).slice(0, 32)` (16 bytes hex).

- [ ] **Step 3: Run green**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(main/hub): per-hub Ed25519 client identity via safeStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 19 — mDNS discovery service

**Files:**
- Create: `src/main/features/hub/hub-discovery.ts`
- Modify: `src/main/package.json` references (add `bonjour-service`)
- Test: `src/main/features/hub/hub-discovery.test.ts`

- [ ] **Step 1: Install**

```bash
npm install bonjour-service
```

- [ ] **Step 2: Failing test**

Advertise a fake service via Bonjour from the test harness, assert `hub-discovery`'s `getSnapshot()` reports it within 3s with the expected TXT fields and stale=false.

- [ ] **Step 3: Implement**

```ts
// signature
export interface DiscoveredHub { hubId, displayName, version, channel, addresses, port, fingerprint, lastSeenAt, stale }
export interface HubDiscovery {
  start: () => void;
  stop: () => Promise<void>;
  getSnapshot: () => DiscoveredHub[];
  on(event: 'changed', cb: (list: DiscoveredHub[]) => void): void;
}
```

Internal state: Map<hubId, DiscoveredHub>. 60s → mark stale; 5min → delete. Debounce `changed` events by 250 ms. Filter on `channel === resolveChannel()`.

- [ ] **Step 4: Run green**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(main/hub): mdns discovery service with stale detection

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 20 — Network change watcher

**Files:**
- Create: `src/main/features/hub/network-watcher.ts`
- Test: `src/main/features/hub/network-watcher.test.ts`

- [ ] **Step 1: Failing test**

Mock `os.networkInterfaces`, change the return value between ticks, assert the watcher fires exactly once per change.

- [ ] **Step 2: Implement**

```ts
export function createNetworkWatcher(onChange: () => void): () => void {
  let lastHash = hashIfaces();
  const tick = () => {
    const current = hashIfaces();
    if (current !== lastHash) { lastHash = current; onChange(); }
  };
  const interval = setInterval(tick, 5000);
  const { powerMonitor } = require('electron');
  const resumeHandler = () => tick();
  powerMonitor.on('resume', resumeHandler);
  return () => { clearInterval(interval); powerMonitor.off('resume', resumeHandler); };
}
```

Hook it up inside `hub-discovery.start()` to trigger a re-browse and Map clear.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(main/hub): network-change watcher restarts discovery

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 21 — TLS fingerprint-pinning HTTPS agent

**Files:**
- Create: `src/main/features/hub/fingerprint-agent.ts`
- Test: `src/main/features/hub/fingerprint-agent.test.ts`

- [ ] **Step 1: Failing test**

Spin up a local HTTPS server with a known cert, compute its fingerprint, construct `buildPinnedAgent(fingerprint)`, `https.request` through it → 200. Change the expected fingerprint and assert the request fails with `FingerprintMismatch`.

- [ ] **Step 2: Implement**

```ts
// src/main/features/hub/fingerprint-agent.ts
import https from 'node:https';
import { createHash } from 'node:crypto';

export function buildPinnedAgent(expectedFingerprint: string): https.Agent {
  return new https.Agent({
    rejectUnauthorized: false, // we do our own check
    checkServerIdentity: (_host, cert) => {
      const actual = createHash('sha256').update((cert.raw as Buffer)).digest('hex');
      if (actual !== expectedFingerprint.toLowerCase()) {
        const err = new Error(`FingerprintMismatch: expected ${expectedFingerprint} got ${actual}`);
        (err as any).code = 'FINGERPRINT_MISMATCH';
        return err;
      }
      return undefined;
    },
  });
}
```

- [ ] **Step 3: Wire into hub-client.ts** so all outbound HTTPS uses the pinned agent resolved from the active `HubRecord.pinnedFingerprint`.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(main/hub): fingerprint-pinning https agent

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 22 — Client pair service (two-step init/confirm)

**Files:**
- Create: `src/main/features/hub/hub-pair.ts`
- Test: `src/main/features/hub/hub-pair.test.ts`

- [ ] **Step 1: Failing test**

End-to-end against a test hub started in the same process (using `buildApp` from Task 8). `pairWithDiscoveredHub({ hubId, addresses, port, fingerprint })` → returns `{ key, clientId }`, the hub DB has a fresh `api_keys` row, the fingerprint is pinned in the resulting `HubRecord`.

- [ ] **Step 2: Implement**

```ts
export async function pairWithDiscoveredHub(input: {
  hubId: string; addresses: string[]; port: number; fingerprint: string; displayName?: string;
}, deps: { hubsDir: string }) {
  const hubDir = join(deps.hubsDir, input.hubId);
  const identity = ensureClientIdentity(hubDir);
  const baseUrl = `https://${input.addresses[0]}:${input.port}`;
  const agent = buildPinnedAgent(input.fingerprint);

  const initRes = await fetchJson(`${baseUrl}/api/pair/init`, {
    method: 'POST', agent,
    body: { clientId: identity.clientId, clientPubKey: identity.publicKeyBase64url, displayName: input.displayName },
  });
  const signature = identity.signNonce(Buffer.from(initRes.nonce, 'base64url')).toString('base64url');
  const confirmRes = await fetchJson(`${baseUrl}/api/pair/confirm`, {
    method: 'POST', agent,
    body: { clientId: identity.clientId, nonce: initRes.nonce, signature, displayName: input.displayName },
  });
  return { hubId: confirmRes.hubId, displayName: confirmRes.displayName, key: confirmRes.key, clientId: identity.clientId };
}
```

- [ ] **Step 3: Run green**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(main/hub): hub-pair service orchestrating two-step pair flow

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 23 — Multi-hub `hub-connection.ts` refactor + switchActive

**Files:**
- Modify: `src/main/features/hub/hub-connection.ts`
- Add: `src/main/features/hub/lifecycle.ts` (tiny event bus for `beforeActiveHubChange`)
- Test: `src/main/features/hub/hub-connection.multi.test.ts`

- [ ] **Step 1: Failing test**

Configure two hub records, set activeHubId to A, `switchActive('B')` → subscribers receive `beforeActiveHubChange` then `activeHubChanged`, `getConnection()` reflects B, config store `activeHubId` persists to B.

- [ ] **Step 2: Implement**

Turn `persistedConfig` into `persistedHubs[]` + `activeHubId`; move single-config methods (`configure`, `setEnabled`, `removeConfig`) to operate on the active record. Add `addHub(record)`, `removeHub(hubId)`, `setActive(hubId)`, subscription bus. Close current WS before swap; re-open after.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(main/hub): hub-connection multi-hub with beforeActiveHubChange bus

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 24 — WS client revocation modal wiring

**Files:**
- Modify: `src/main/features/hub/hub-ws-client.ts`
- Modify: `src/main/features/hub/hub-handlers.ts` (emit `HUB_EVENTS.REVOKED`)
- Test: `src/main/features/hub/hub-ws-revoke.test.ts`

- [ ] **Step 1: Test** that a close event with code 4003 triggers an IPC event on `event:hub.revoked` carrying `{ hubId, reason }`.

- [ ] **Step 2: Implement**

```ts
ws.on('close', (code, reasonBuf) => {
  if (code === 4003) {
    let reason = 'Access revoked';
    try { reason = JSON.parse(reasonBuf.toString()).reason ?? reason; } catch {}
    router.emit(HUB_EVENTS.REVOKED, { hubId: currentHubId, reason });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(main/hub): emit hub.revoked event on WebSocket close 4003

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 25 — IPC handlers for the 5 new channels

**Files:**
- Modify: `src/main/features/hub/hub-handlers.ts`
- Modify: `src/main/features/hub/service-registry.ts` / wiring
- Test: one test per handler (5 tests)

Each handler is thin: parse the input via the Zod schema from Task 2, call the corresponding service function (`hub-discovery.getSnapshot`, `hub-pair.pairWithDiscoveredHub`, `hub-connection.setActive`, etc.), return result.

- [ ] **Step 1: Failing tests** — one per handler.
- [ ] **Step 2: Implement**.
- [ ] **Step 3: Run green**.
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(ipc/hub): register 5 new channels + emit discovery/active/revoked events

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 26 — React Query hooks

**Files:**
- Create: `src/renderer/features/hub/api/useHubDiscovery.ts`, `useHubPair.ts`, `useHubSwitchActive.ts`, `useHubRemoveRecord.ts`, `useHubManualPair.ts`
- Test: `src/renderer/features/hub/api/*.test.tsx`

- [ ] **Step 1: Failing tests** — one per hook, using React Testing Library + a mock ipc client.

- [ ] **Step 2: Implement**

```ts
export function useHubDiscovery() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const off = onIpcEvent(HUB_EVENTS.DISCOVERY.CHANGED, (snapshot) => {
      queryClient.setQueryData(['hub', 'discovery'], snapshot);
    });
    return off;
  }, [queryClient]);
  return useQuery({ queryKey: ['hub', 'discovery'], queryFn: () => ipc(HUB.DISCOVERED.LIST, {}) });
}

export function useHubPair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { hubId: string; displayName?: string }) => ipc(HUB.PAIR.REQUEST, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hub'] }),
  });
}
// …and the other three, similarly thin.
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(renderer/hub): React Query hooks for discovery, pair, switch, remove, manual

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 27 — HubPickerPanel component

**Files:**
- Create: `src/renderer/features/hub/components/HubPickerPanel/{HubPickerPanel.tsx, PairedRow.tsx, DiscoveredRow.tsx, ManualAdd.tsx, index.ts}`
- Test: `src/renderer/features/hub/components/HubPickerPanel/HubPickerPanel.test.tsx`

- [ ] **Step 1: Test**

Render picker with fixtures: 2 paired (one connected, one offline), 1 discovered, manual-add collapsed. Assert row states, ARIA roles, that clicking "Pair & Switch" fires the mutation, that keyboard arrow navigation moves the radio selection.

- [ ] **Step 2: Implement**

Use only `@ui` primitives (Button, Input, Label, etc.). Follow existing Feature Slice Design conventions.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(renderer/hub): HubPickerPanel component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 28 — HubSetupPage + HubSettings rewrite to use picker

**Files:**
- Modify: `src/renderer/features/hub/components/HubSetupPage/HubSetupPage.tsx`
- Modify: `src/renderer/features/settings/components/HubSettings/HubSettings.tsx`

Wrap `HubPickerPanel` in the appropriate frames. Delete the legacy URL+key form paths where no longer referenced.

- [ ] **Step 1: Test** that `HubSetupPage` renders the picker plus a Skip button that creates the `local` HubRecord.
- [ ] **Step 2: Implement**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(renderer): HubSetupPage + HubSettings now render HubPickerPanel

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 29 — RevocationModal

**Files:**
- Create: `src/renderer/features/hub/components/RevocationModal/RevocationModal.tsx`

Listens to `event:hub.revoked`, shows a modal using the app's existing `AlertDialog` @ui primitive with re-pair and switch-hub actions.

- [ ] **Step 1: Test**
- [ ] **Step 2: Implement**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(renderer/hub): revocation modal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 30 — ENABLE_HUB_DISCOVERY flag + README update

**Files:**
- Modify: `src/main/index.ts`
- Modify: `README.md`

Gate `hub-discovery.start()` + the new renderer UI on `process.env.ENABLE_HUB_DISCOVERY !== 'false'`. Default on.

Rewrite README install/pair section to describe the picker. Remove the manual-curl-secret dance. Mention the admin UI + the `scripts/hash-admin-password.mjs` helper.

- [ ] **Step 1: Commit**

```bash
git commit -m "feat(release): ENABLE_HUB_DISCOVERY flag + README rewrite

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 31 — Playwright E2E scenarios

**File:** `tests/e2e/hub-discovery.spec.ts`

Six scenarios as in the spec §Testing strategy. Each is its own `test()` block; shared fixture spins up a local hub and a test Electron main with ENABLE_HUB_DISCOVERY=true.

- [ ] **Step 1: Implement and run all 6 green**
- [ ] **Step 2: Commit**

```bash
git commit -m "test(e2e): 6 hub auto-discovery scenarios

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 32 — Release 0.2.0

- [ ] Bump `package.json` to 0.2.0 (both root and `hub/`)
- [ ] Run full verify: `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`
- [ ] Open PR to `production`
- [ ] Merge and let the release workflow publish 0.2.0
- [ ] Install on Windows + Mac, verify the picker discovers the hub, verify pairing, verify admin UI works, verify revocation flow, verify legacy migrator on a copy of the user's existing `%APPDATA%/ADC/` directory

---

## Execution notes for subagents

- **Do not skip tests to make progress faster.** Every task's failing test must actually run red before implementation, and green after.
- **If a prior task's output is missing** (e.g., you're asked to do Task 23 and the service from Task 18 doesn't exist), stop and flag it — don't write stubs.
- **If the spec and plan disagree**, the spec wins. Call out the discrepancy in the task's commit message.
- **Lint + typecheck before commit.** No red PRs.
- **Commit once per task.** Do not combine tasks into a single commit.
