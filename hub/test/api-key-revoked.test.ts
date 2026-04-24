import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import Fastify from 'fastify';

import { runMigrations } from '../src/db/migration-runner.js';
import { createApiKeyMiddleware, hashKey } from '../src/middleware/api-key.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'src', 'db', 'migrations');

interface ProtectedResponse {
  status: number;
  body: string;
}

async function buildMinimalApp(db: Database.Database) {
  const app = Fastify({ logger: false });
  app.addHook('onRequest', createApiKeyMiddleware(db));
  app.get('/test/protected', async (request) => {
    return { ok: true, clientId: (request as unknown as { clientId?: string }).clientId ?? null };
  });
  await app.ready();
  return app;
}

function insertApiKey(
  db: Database.Database,
  opts: {
    id: string;
    key: string;
    clientId?: string | null;
    revokedAt?: number | null;
    revokedReason?: string | null;
  },
): void {
  db.prepare(
    `INSERT INTO api_keys (id, key_hash, name, client_id, revoked_at, revoked_reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    opts.id,
    hashKey(opts.key),
    'test-key',
    opts.clientId ?? null,
    opts.revokedAt ?? null,
    opts.revokedReason ?? null,
  );
}

async function inject(
  app: Awaited<ReturnType<typeof buildMinimalApp>>,
  apiKey: string,
): Promise<ProtectedResponse> {
  const res = await app.inject({
    method: 'GET',
    url: '/test/protected',
    headers: { 'x-api-key': apiKey },
  });
  return { status: res.statusCode, body: res.body };
}

test('api-key middleware rejects a revoked key with 401 and reason in body', async () => {
  const db = new Database(':memory:');
  try {
    runMigrations(db, migrationsDir);
    insertApiKey(db, {
      id: 'k1',
      key: 'secret-revoked',
      clientId: 'client-1',
      revokedAt: Date.now(),
      revokedReason: 'compromised',
    });
    const app = await buildMinimalApp(db);
    try {
      const res = await inject(app, 'secret-revoked');
      assert.equal(res.status, 401);
      assert.ok(
        res.body.toLowerCase().includes('revoked'),
        `expected body to mention "revoked", got: ${res.body}`,
      );
      assert.ok(
        res.body.includes('compromised'),
        `expected body to include reason, got: ${res.body}`,
      );
    } finally {
      await app.close();
    }
  } finally {
    db.close();
  }
});

test('api-key middleware rejects a revoked key even when reason is null', async () => {
  const db = new Database(':memory:');
  try {
    runMigrations(db, migrationsDir);
    insertApiKey(db, {
      id: 'k2',
      key: 'secret-revoked-noreason',
      clientId: 'client-2',
      revokedAt: Date.now(),
      revokedReason: null,
    });
    const app = await buildMinimalApp(db);
    try {
      const res = await inject(app, 'secret-revoked-noreason');
      assert.equal(res.status, 401);
      assert.ok(res.body.toLowerCase().includes('revoked'));
    } finally {
      await app.close();
    }
  } finally {
    db.close();
  }
});

test('api-key middleware accepts a non-revoked key and sets clientId on request', async () => {
  const db = new Database(':memory:');
  try {
    runMigrations(db, migrationsDir);
    insertApiKey(db, {
      id: 'k3',
      key: 'secret-valid',
      clientId: 'client-3',
      revokedAt: null,
      revokedReason: null,
    });
    const app = await buildMinimalApp(db);
    try {
      const res = await inject(app, 'secret-valid');
      assert.equal(res.status, 200);
      const parsed = JSON.parse(res.body) as { ok: boolean; clientId: string | null };
      assert.equal(parsed.ok, true);
      assert.equal(parsed.clientId, 'client-3');
    } finally {
      await app.close();
    }
  } finally {
    db.close();
  }
});

test('api-key middleware rejects missing header with 401', async () => {
  const db = new Database(':memory:');
  try {
    runMigrations(db, migrationsDir);
    const app = await buildMinimalApp(db);
    try {
      const res = await app.inject({ method: 'GET', url: '/test/protected' });
      assert.equal(res.statusCode, 401);
      assert.ok(res.body.includes('Missing'));
    } finally {
      await app.close();
    }
  } finally {
    db.close();
  }
});

test('api-key middleware rejects unknown key with 401 (and does not mention revoked)', async () => {
  const db = new Database(':memory:');
  try {
    runMigrations(db, migrationsDir);
    const app = await buildMinimalApp(db);
    try {
      const res = await inject(app, 'nonexistent');
      assert.equal(res.status, 401);
      assert.ok(!res.body.toLowerCase().includes('revoked'));
      assert.ok(res.body.includes('Invalid'));
    } finally {
      await app.close();
    }
  } finally {
    db.close();
  }
});
