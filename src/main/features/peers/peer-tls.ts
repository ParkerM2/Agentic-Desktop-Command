import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';

const webcrypto = new Crypto();
x509.cryptoProvider.set(webcrypto);

export interface PeerTlsMaterial {
  cert: string;
  key: string;
  fingerprint: string;
}

const CERT_VALIDITY_DAYS = 365 * 10;
const CERT_FILE = 'peer-tls.cert.pem';
const KEY_FILE = 'peer-tls.key.pem';

export function computeCertFingerprint(pem: string): string {
  const der = Buffer.from(
    pem.replaceAll(/-----(BEGIN|END) CERTIFICATE-----/g, '').replaceAll(/\s+/g, ''),
    'base64',
  );
  return createHash('sha256').update(der).digest('hex');
}

function pemFromDer(label: string, der: Buffer): string {
  const b64 = der.toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}

async function generateCert(peerId: string): Promise<PeerTlsMaterial> {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  );
  const now = new Date();
  const notAfter = new Date(now.getTime() + CERT_VALIDITY_DAYS * 86_400_000);

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: '01',
    name: `CN=${peerId}`,
    notBefore: now,
    notAfter,
    signingAlgorithm: { name: 'Ed25519' },
    keys: keyPair,
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyCertSign,
      ),
    ],
  });

  const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const key = pemFromDer('PRIVATE KEY', Buffer.from(pkcs8));
  const certPem = x509.PemConverter.encode(cert.rawData, 'CERTIFICATE');
  return { cert: certPem, key, fingerprint: computeCertFingerprint(certPem) };
}

export async function resolvePeerTls(dataDir: string, peerId: string): Promise<PeerTlsMaterial> {
  mkdirSync(dataDir, { recursive: true });
  const certPath = join(dataDir, CERT_FILE);
  const keyPath = join(dataDir, KEY_FILE);

  if (existsSync(certPath) && existsSync(keyPath)) {
    const cert = readFileSync(certPath, 'utf8');
    const key = readFileSync(keyPath, 'utf8');
    return { cert, key, fingerprint: computeCertFingerprint(cert) };
  }

  const material = await generateCert(peerId);
  writeFileSync(certPath, material.cert, { mode: 0o600 });
  writeFileSync(keyPath, material.key, { mode: 0o600 });
  if (process.platform !== 'win32') {
    chmodSync(certPath, 0o600);
    chmodSync(keyPath, 0o600);
  }
  return material;
}
