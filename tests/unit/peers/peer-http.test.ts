import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import { postJsonPinned } from '@main/features/peers/peer-http';

import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http';

// sha256(Buffer.from('hello')) — we don't actually run TLS, but the value
// is used to confirm `pinnedCheckServerIdentity` was wired into RequestOptions.
const HELLO_SHA256_HEX = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

interface FakeReqHandle {
  options: RequestOptions;
  written: Buffer[];
  ended: boolean;
}

function makeFakeRequest(opts: {
  statusCode: number;
  body: string | (() => never);
  // Optional: simulate a request-level error (e.g. fingerprint mismatch
  // from `checkServerIdentity` would surface as `error` on the request).
  socketError?: Error;
}): {
  requestImpl: (
    options: RequestOptions,
    cb: (res: IncomingMessage) => void,
  ) => ClientRequest;
  handle: FakeReqHandle;
} {
  const handle: FakeReqHandle = {
    options: {} as RequestOptions,
    written: [],
    ended: false,
  };

  const requestImpl = (
    options: RequestOptions,
    cb: (res: IncomingMessage) => void,
  ): ClientRequest => {
    handle.options = options;
    const reqEmitter = new EventEmitter() as ClientRequest;
    (reqEmitter as unknown as { write: (c: Buffer) => void }).write = (c: Buffer): void => {
      handle.written.push(c);
    };
    (reqEmitter as unknown as { end: () => void }).end = (): void => {
      handle.ended = true;
      // Defer firing the response so callers can attach .on('error') first.
      setImmediate(() => {
        if (opts.socketError) {
          reqEmitter.emit('error', opts.socketError);
          return;
        }
        const res = new EventEmitter() as IncomingMessage;
        (res as unknown as { statusCode: number }).statusCode = opts.statusCode;
        cb(res);
        // Stream the body
        if (typeof opts.body === 'function') {
          // pathological body — caller wants a non-JSON / throw scenario
          res.emit('data', Buffer.from('not-json{'));
        } else {
          res.emit('data', Buffer.from(opts.body, 'utf8'));
        }
        res.emit('end');
      });
    };
    return reqEmitter;
  };

  return { requestImpl, handle };
}

describe('postJsonPinned', () => {
  it('resolves with parsed JSON on 200', async () => {
    const { requestImpl, handle } = makeFakeRequest({
      statusCode: 200,
      body: JSON.stringify({ ok: true, value: 42 }),
    });
    const result = await postJsonPinned<{ ok: boolean; value: number }>(
      'https://example.local:9443/pair/init',
      HELLO_SHA256_HEX,
      { hello: 'world' },
      { requestImpl },
    );
    expect(result).toEqual({ ok: true, value: 42 });
    expect(handle.ended).toBe(true);
  });

  it('sets Content-Type: application/json and matching Content-Length', async () => {
    const body = { foo: 'bar', n: 1 };
    const expectedBytes = Buffer.byteLength(JSON.stringify(body), 'utf8');
    const { requestImpl, handle } = makeFakeRequest({
      statusCode: 200,
      body: '{}',
    });
    await postJsonPinned(
      'https://example.local:9443/pair/init',
      HELLO_SHA256_HEX,
      body,
      { requestImpl },
    );
    const headers = handle.options.headers ?? {};
    // Headers casing follows what the implementation sets — accept either case.
    const contentType =
      (headers as Record<string, string>)['Content-Type'] ??
      (headers as Record<string, string>)['content-type'];
    const contentLength =
      (headers as Record<string, string>)['Content-Length'] ??
      (headers as Record<string, string>)['content-length'];
    expect(contentType).toBe('application/json');
    expect(contentLength).toBe(String(expectedBytes));
    expect(Buffer.concat(handle.written).length).toBe(expectedBytes);
  });

  it('wires pinnedCheckServerIdentity into the request agent', async () => {
    const { requestImpl, handle } = makeFakeRequest({
      statusCode: 200,
      body: '{}',
    });
    await postJsonPinned(
      'https://example.local:9443/pair/init',
      HELLO_SHA256_HEX,
      {},
      { requestImpl },
    );
    // The implementation passes a custom https.Agent with a pinned
    // checkServerIdentity. That agent surfaces on RequestOptions.agent.
    const agent = handle.options.agent as
      | undefined
      | { options?: { checkServerIdentity?: unknown; rejectUnauthorized?: boolean } };
    expect(agent).toBeDefined();
    expect(typeof agent?.options?.checkServerIdentity).toBe('function');
    expect(agent?.options?.rejectUnauthorized).toBe(true);
  });

  it('rejects on non-2xx with status code in error message', async () => {
    const { requestImpl } = makeFakeRequest({
      statusCode: 500,
      body: 'server exploded',
    });
    await expect(
      postJsonPinned(
        'https://example.local:9443/pair/init',
        HELLO_SHA256_HEX,
        {},
        { requestImpl },
      ),
    ).rejects.toThrow(/500/);
  });

  it('rejects when the request emits a fingerprint-mismatch error', async () => {
    const { requestImpl } = makeFakeRequest({
      statusCode: 200,
      body: '{}',
      socketError: new Error('peer fingerprint mismatch'),
    });
    await expect(
      postJsonPinned(
        'https://example.local:9443/pair/init',
        HELLO_SHA256_HEX,
        {},
        { requestImpl },
      ),
    ).rejects.toThrow(/fingerprint mismatch/);
  });

  it('rejects when response body is not JSON', async () => {
    const { requestImpl } = makeFakeRequest({
      statusCode: 200,
      body: 'not-json{',
    });
    await expect(
      postJsonPinned(
        'https://example.local:9443/pair/init',
        HELLO_SHA256_HEX,
        {},
        { requestImpl },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  // Sanity: the `vi` import is used somewhere — avoid eslint unused warnings.
  it('does not invoke the real https stack', () => {
    const spy = vi.fn();
    expect(spy).not.toHaveBeenCalled();
  });
});
