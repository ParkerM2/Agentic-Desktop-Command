/**
 * OAuth Provider Credential Storage
 *
 * Loads/saves OAuth client credentials (clientId, clientSecret)
 * from <userData>/oauth-providers.json. Credentials are stored
 * in plaintext JSON — the actual secrets should only be entered
 * by the local user via the Settings UI.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

type CredentialsFile = Record<string, OAuthCredentials>;

const CREDENTIALS_FILENAME = 'oauth-providers.json';

function getCredentialsPath(dataDir: string): string {
  return join(dataDir, CREDENTIALS_FILENAME);
}

export function loadOAuthCredentials(dataDir: string): Map<string, OAuthCredentials> {
  const filePath = getCredentialsPath(dataDir);
  const result = new Map<string, OAuthCredentials>();

  if (!existsSync(filePath)) {
    return result;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as CredentialsFile;

    for (const [name, creds] of Object.entries(parsed)) {
      if (creds.clientId && creds.clientSecret) {
        result.set(name, { clientId: creds.clientId, clientSecret: creds.clientSecret });
      }
    }
  } catch {
    console.error('[OAuth] Failed to load provider credentials');
  }

  return result;
}

export function saveOAuthCredentials(
  dataDir: string,
  name: string,
  creds: OAuthCredentials,
): void {
  const filePath = getCredentialsPath(dataDir);
  let existing: CredentialsFile = {};

  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(readFileSync(filePath, 'utf-8')) as CredentialsFile;
    } catch {
      // Start fresh
    }
  }

  existing[name] = { clientId: creds.clientId, clientSecret: creds.clientSecret };

  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
}
