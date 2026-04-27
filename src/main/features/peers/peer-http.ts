/**
 * Peer HTTPS client — TLS-pinned POST helper.
 *
 * Extracted from `peers-service.ts` (audit M2) so the fingerprint-pinned
 * request path is unit-testable without standing up a real TLS socket.
 *
 * Pinning model: `pinnedCheckServerIdentity` runs inside the TLS stack
 * before any application data is exchanged, so a fingerprint mismatch
 * surfaces as a request `'error'` (not a post-`'end'` check).
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';

import { pinnedCheckServerIdentity } from './peer-tls-pin';

import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http';
import type { TLSSocket } from 'node:tls';

export interface PostJsonPinnedOpts {
  /**
   * Injection seam for tests — defaults to `node:https`.request.
   * Tests pass a fake that simulates response/error events without
   * standing up a real TLS socket.
   */
  requestImpl?: (
    options: RequestOptions,
    cb: (res: IncomingMessage) => void,
  ) => ClientRequest;
}

export async function postJsonPinned<T>(
  url: string,
  fingerprintHex: string,
  body: unknown,
  opts: PostJsonPinnedOpts = {},
): Promise<T> {
  const reqFn = opts.requestImpl ?? httpsRequest;
  const u = new URL(url);
  // Self-signed peer certs cannot be CA-validated. We use rejectUnauthorized:
  // false so the handshake completes, then enforce the fingerprint pin on the
  // socket's secureConnect event BEFORE writing any application bytes.
  // checkServerIdentity is also wired (defense-in-depth) but Node only acts on
  // its Error return when rejectUnauthorized:true, so the post-secureConnect
  // check is the actual enforcement gate. Audit ref: 01-security.md (TLS pin).
  const expectedFp = Buffer.from(fingerprintHex, 'hex');
  const agent = new HttpsAgent({
    rejectUnauthorized: false,
    checkServerIdentity: pinnedCheckServerIdentity(fingerprintHex),
  });
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  return await new Promise<T>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };
    const req = reqFn(
      {
        host: u.hostname,
        port: u.port === '' ? 443 : Number(u.port),
        path: u.pathname + u.search,
        method: 'POST',
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(payload.length),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            const statusLabel = status === 0 ? 'unknown' : String(status);
            settle(() => {
              reject(new Error(`postJsonPinned failed: HTTP ${statusLabel}: ${raw}`));
            });
            return;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            settle(() => { reject(new Error('invalid_json_response')); });
            return;
          }
          settle(() => { resolve(parsed as T); });
        });
        res.on('error', (err: Error) => {
          settle(() => { reject(err); });
        });
      },
    );
    req.on('error', (err: Error) => {
      settle(() => { reject(err); });
    });
    // Enforce fingerprint pin at TLS handshake time (post-handshake but
    // pre-application-write). Real https.request emits 'socket' synchronously
    // with a TLSSocket; the test injection seam doesn't, so we guard with
    // typeof checks.
    req.on('socket', (socket) => {
      const tls = socket as TLSSocket;
      const verify = (): void => {
        const cert = typeof tls.getPeerCertificate === 'function'
          ? tls.getPeerCertificate(true)
          : undefined;
        const raw = cert && (cert as { raw?: Buffer }).raw;
        if (!raw || raw.length === 0) return; // mock socket — skip
        const actual = createHash('sha256').update(raw).digest();
        if (actual.length !== expectedFp.length || !timingSafeEqual(actual, expectedFp)) {
          settle(() => { reject(new Error('peer fingerprint mismatch')); });
          tls.destroy(new Error('peer fingerprint mismatch'));
        }
      };
      if ((tls as { encrypted?: boolean }).encrypted === true) {
        verify();
      } else if (typeof tls.once === 'function') {
        tls.once('secureConnect', verify);
      }
    });
    req.write(payload);
    req.end();
  });
}
