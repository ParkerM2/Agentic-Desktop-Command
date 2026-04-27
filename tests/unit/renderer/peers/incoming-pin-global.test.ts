/**
 * Verifies that <IncomingPinDialog /> is mounted globally at RootLayout
 * (not gated behind /settings) so a PIN issued while the user is on any
 * route is surfaced.
 *
 * Approach: vitest runs in `node` environment in this repo (no jsdom — see
 * vitest.config.ts). Rather than introducing a DOM dependency, this is a
 * static-analysis backstop that asserts:
 *   1. RootLayout imports IncomingPinDialog from `@features/peers`.
 *   2. RootLayout renders <IncomingPinDialog /> in its JSX.
 *   3. SettingsPage no longer renders <IncomingPinDialog /> and the
 *      TODO(p2p-phase4) marker is gone.
 *
 * If a future jsdom-enabled vitest project is added, this should be replaced
 * with a render test using @testing-library/react.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const ROOT_LAYOUT_PATH = resolve(
  __dirname,
  '../../../../src/renderer/app/layouts/RootLayout.tsx',
);
const SETTINGS_PAGE_PATH = resolve(
  __dirname,
  '../../../../src/renderer/features/settings/components/SettingsPage.tsx',
);

describe('IncomingPinDialog global mount', () => {
  it('RootLayout imports IncomingPinDialog from @features/peers', () => {
    const src = readFileSync(ROOT_LAYOUT_PATH, 'utf8');
    expect(src).toMatch(/import\s*\{[^}]*\bIncomingPinDialog\b[^}]*\}\s*from\s*['"]@features\/peers['"]/);
  });

  it('RootLayout renders <IncomingPinDialog /> in JSX', () => {
    const src = readFileSync(ROOT_LAYOUT_PATH, 'utf8');
    expect(src).toMatch(/<IncomingPinDialog\s*\/>/);
  });

  it('SettingsPage no longer renders <IncomingPinDialog />', () => {
    const src = readFileSync(SETTINGS_PAGE_PATH, 'utf8');
    expect(src).not.toMatch(/<IncomingPinDialog\s*\/>/);
  });

  it('SettingsPage no longer carries the TODO(p2p-phase4) marker', () => {
    const src = readFileSync(SETTINGS_PAGE_PATH, 'utf8');
    expect(src).not.toMatch(/TODO\(p2p-phase4\)/);
  });

  it('SettingsPage does not import IncomingPinDialog (avoids dead import)', () => {
    const src = readFileSync(SETTINGS_PAGE_PATH, 'utf8');
    expect(src).not.toMatch(/\bIncomingPinDialog\b/);
  });
});
