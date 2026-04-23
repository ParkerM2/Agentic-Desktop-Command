import 'reflect-metadata';
import { createHash } from 'node:crypto';

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';

const webcrypto = new Crypto();
x509.cryptoProvider.set(webcrypto);

export interface TestCert {
  certPem: string;
  keyPem: string;
  fingerprint: string;
}

function pemFromDer(label: string, der: Buffer): string {
  const b64 = der.toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}

/**
 * Generate a self-signed Ed25519 cert + key pair plus its SHA-256 DER
 * fingerprint, suitable for spinning up an https.Server in tests. Mirrors
 * the shape used by hub/src/lib/tls.ts::resolveTls so the pinned-agent
 * tests exercise real cert/fingerprint identity, not a mock.
 */
export async function generateTestCert(): Promise<TestCert> {
  const keys = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: '01',
    name: 'CN=test-hub',
    notBefore: new Date(),
    notAfter: new Date(Date.now() + 365 * 86_400_000),
    signingAlgorithm: { name: 'Ed25519' },
    keys,
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.SubjectAlternativeNameExtension([
        { type: 'dns', value: 'localhost' },
        { type: 'ip', value: '127.0.0.1' },
      ]),
    ],
  });

  const certPem = x509.PemConverter.encode(cert.rawData, 'CERTIFICATE');
  const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', keys.privateKey);
  const keyPem = pemFromDer('PRIVATE KEY', Buffer.from(pkcs8));
  const fingerprint = createHash('sha256').update(Buffer.from(cert.rawData)).digest('hex');

  return { certPem, keyPem, fingerprint };
}
