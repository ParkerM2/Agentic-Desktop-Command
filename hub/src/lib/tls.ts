import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';

const webcrypto = new Crypto();
x509.cryptoProvider.set(webcrypto);

export interface TlsMaterial {
  cert: string;
  key: string;
  fingerprint: string;
}

const CERT_VALIDITY_DAYS = 365;
const ROTATE_IF_WITHIN_DAYS = 30;

function fingerprintOfPem(pem: string): string {
  const der = Buffer.from(
    pem.replaceAll(/-----(BEGIN|END) CERTIFICATE-----/g, '').replaceAll(/\s+/g, ''),
    'base64',
  );
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

function pemFromDer(label: string, der: Buffer): string {
  const b64 = der.toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}

async function generateCert(hubId: string, opts?: { notAfter?: Date }): Promise<TlsMaterial> {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  );
  const now = new Date();
  const notAfter = opts?.notAfter ?? new Date(now.getTime() + CERT_VALIDITY_DAYS * 86_400_000);
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
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyCertSign,
      ),
      new x509.SubjectAlternativeNameExtension(
        sans.map((s) =>
          s.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(s)
            ? { type: 'ip' as const, value: s }
            : { type: 'dns' as const, value: s },
        ),
      ),
    ],
  });

  const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const key = pemFromDer('PRIVATE KEY', Buffer.from(pkcs8));
  const certPem = x509.PemConverter.encode(cert.rawData, 'CERTIFICATE');
  return { cert: certPem, key, fingerprint: fingerprintOfPem(certPem) };
}

function daysUntilExpiry(pem: string): number {
  const cert = new x509.X509Certificate(pem);
  return (cert.notAfter.getTime() - Date.now()) / 86_400_000;
}

export async function resolveTls(
  dataDir: string,
  hubId: string,
  opts?: { notAfter?: Date },
): Promise<TlsMaterial> {
  mkdirSync(dataDir, { recursive: true });
  const certPath = join(dataDir, 'tls.cert.pem');
  const keyPath = join(dataDir, 'tls.key.pem');

  if (existsSync(certPath) && existsSync(keyPath) && !opts?.notAfter) {
    const existing = readFileSync(certPath, 'utf8');
    if (daysUntilExpiry(existing) > ROTATE_IF_WITHIN_DAYS) {
      return {
        cert: existing,
        key: readFileSync(keyPath, 'utf8'),
        fingerprint: fingerprintOfPem(existing),
      };
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
