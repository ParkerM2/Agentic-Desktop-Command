import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:https';
import { request as httpRequest } from 'node:http';

import { buildApp } from '../src/app.js';

interface HttpsResponse {
  status: number;
  body: string;
}

function httpsGet(opts: {
  host: string;
  port: number;
  path: string;
  ca: string;
  headers?: Record<string, string>;
}): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: opts.host,
        port: opts.port,
        path: opts.path,
        method: 'GET',
        ca: opts.ca,
        rejectUnauthorized: true,
        servername: 'localhost',
        headers: opts.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

test('buildApp serves /api/health over HTTPS with self-signed cert', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hub-https-'));
  try {
    const { app, tls, hubId } = await buildApp({ dataDir: dir });
    try {
      await app.listen({ host: '127.0.0.1', port: 0 });
      const address = app.server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('no address');
      }
      const res = await httpsGet({
        host: '127.0.0.1',
        port: address.port,
        path: '/api/health',
        ca: tls.cert,
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.includes('"status":"ok"'), `body: ${res.body}`);
      assert.match(hubId, /[-0-9a-f]{36}/);
      assert.match(tls.fingerprint, /^[0-9a-f]+$/);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildApp rejects plain HTTP (TLS required)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hub-https-'));
  try {
    const { app } = await buildApp({ dataDir: dir });
    try {
      await app.listen({ host: '127.0.0.1', port: 0 });
      const address = app.server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('no address');
      }
      // A plain-HTTP GET against an HTTPS socket should fail or return a
      // response that is not a valid HTTP response. We assert the connection
      // does not produce a 200 body with "status":"ok".
      const plainBody = await new Promise<string>((resolve) => {
        const req = httpRequest(
          {
            host: '127.0.0.1',
            port: address.port,
            path: '/api/health',
            method: 'GET',
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          },
        );
        req.on('error', () => resolve('__ERR__'));
        req.end();
      });
      assert.ok(
        !plainBody.includes('"status":"ok"'),
        `plain HTTP should not succeed, got: ${plainBody}`,
      );
    } finally {
      await app.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
