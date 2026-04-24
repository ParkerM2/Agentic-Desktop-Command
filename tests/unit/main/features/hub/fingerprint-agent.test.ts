/**
 * Unit tests for buildPinnedAgent.
 *
 * Spins up a real HTTPS server using a self-signed Ed25519 cert generated
 * by @peculiar/x509 (same crypto stack as hub/src/lib/tls.ts), then exercises
 * the pinned agent against both matching and mismatched fingerprints.
 */

import https, { createServer, type RequestOptions, type Server } from 'node:https';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildPinnedAgent, type FingerprintMismatchError } from '@main/features/hub/fingerprint-agent';

import { generateTestCert, type TestCert } from './__helpers__/test-cert';

import type { AddressInfo } from 'node:net';

interface RequestResult {
  body: string;
  statusCode: number | undefined;
}

function httpsGet(options: RequestOptions): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        resolve({ body: Buffer.concat(chunks).toString('utf8'), statusCode: res.statusCode });
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

describe('buildPinnedAgent', () => {
  let cert: TestCert;
  let otherCert: TestCert;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    cert = await generateTestCert();
    otherCert = await generateTestCert();
    server = createServer({ cert: cert.certPem, key: cert.keyPem }, (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    ({ port } = server.address() as AddressInfo);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('allows the request when the fingerprint matches', async () => {
    const agent = buildPinnedAgent(cert.fingerprint);
    const result = await httpsGet({
      hostname: '127.0.0.1',
      port,
      method: 'GET',
      path: '/',
      agent,
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('ok');
  });

  it('surfaces FINGERPRINT_MISMATCH when the peer cert does not match the pin', async () => {
    const agent = buildPinnedAgent(otherCert.fingerprint);
    let caught: unknown;
    try {
      await httpsGet({ hostname: '127.0.0.1', port, method: 'GET', path: '/', agent });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    const err = caught as FingerprintMismatchError;
    expect(err.code).toBe('FINGERPRINT_MISMATCH');
    expect(err.expected).toBe(otherCert.fingerprint.toLowerCase());
    expect(err.actual).toBe(cert.fingerprint.toLowerCase());
  });

  it('treats uppercase pin input as equivalent to lowercase', async () => {
    const agent = buildPinnedAgent(cert.fingerprint.toUpperCase());
    const result = await httpsGet({
      hostname: '127.0.0.1',
      port,
      method: 'GET',
      path: '/',
      agent,
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('ok');
  });
});
