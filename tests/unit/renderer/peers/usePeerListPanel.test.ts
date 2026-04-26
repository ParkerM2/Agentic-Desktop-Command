/**
 * Static-analysis backstop for the MVP separation of `PeerListPanel`.
 *
 * Verifies that the panel delegates to `usePeerListPanel` and that the inline
 * `renderXxxBody` helpers were converted to typed sub-components. Same
 * approach as T13/T14.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const COMPONENT_PATH = resolve(
  __dirname,
  '../../../../src/renderer/features/peers/components/PeerListPanel.tsx',
);
const HOOK_PATH = resolve(
  __dirname,
  '../../../../src/renderer/features/peers/hooks/usePeerListPanel.ts',
);

describe('PeerListPanel (MVP separation)', () => {
  it('imports usePeerListPanel from ../hooks/usePeerListPanel', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).toMatch(
      /import\s*\{[^}]*\busePeerListPanel\b[^}]*\}\s*from\s*['"]\.\.\/hooks\/usePeerListPanel['"]/,
    );
  });

  it('renders the typed sub-components SelfBody, PairedList, DiscoveredList', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).toMatch(/<SelfBody\b/);
    expect(src).toMatch(/<PairedList\b/);
    expect(src).toMatch(/<DiscoveredList\b/);
  });

  it('declares each sub-component as a real function with a props interface', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).toMatch(/function\s+SelfBody\s*\(/);
    expect(src).toMatch(/function\s+PairedList\s*\(/);
    expect(src).toMatch(/function\s+DiscoveredList\s*\(/);
  });

  it('drops the renderXxxBody helper functions', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/renderSelfBody/);
    expect(src).not.toMatch(/renderPairedBody/);
    expect(src).not.toMatch(/renderDiscoveredBody/);
  });

  it('does NOT contain inline revoke.mutate (now lives in the hook)', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/revoke\.mutate\s*\(\s*peerId\s*\)/);
  });

  it('does NOT call useSelfIdentity / usePairedPeers / useDiscoveredPeers / useRevokePeer directly', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/\buseSelfIdentity\s*\(/);
    expect(src).not.toMatch(/\busePairedPeers\s*\(/);
    expect(src).not.toMatch(/\buseDiscoveredPeers\s*\(/);
    expect(src).not.toMatch(/\buseRevokePeer\s*\(/);
  });

  it('does NOT call useState directly (inviteTarget lives in the hook)', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/\buseState\s*[<(]/);
  });
});

describe('usePeerListPanel (presentation hook)', () => {
  it('exists and exports usePeerListPanel', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    expect(src).toMatch(/export\s+function\s+usePeerListPanel\b/);
  });

  it('wraps useSelfIdentity, usePairedPeers, useDiscoveredPeers, useRevokePeer', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    expect(src).toMatch(/\buseSelfIdentity\b/);
    expect(src).toMatch(/\busePairedPeers\b/);
    expect(src).toMatch(/\buseDiscoveredPeers\b/);
    expect(src).toMatch(/\buseRevokePeer\b/);
  });

  it('exposes inviteTarget, openInvite, closeInvite, revokePeer', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    expect(src).toMatch(/\binviteTarget\b/);
    expect(src).toMatch(/\bopenInvite\b/);
    expect(src).toMatch(/\bcloseInvite\b/);
    expect(src).toMatch(/\brevokePeer\b/);
  });
});
