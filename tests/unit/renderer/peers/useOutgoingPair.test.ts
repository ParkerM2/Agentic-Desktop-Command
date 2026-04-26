/**
 * Static-analysis backstop for the MVP separation of `OutgoingPairDialog`.
 *
 * The vitest project runs in `node` (no jsdom), so we verify the refactor
 * shape by reading the component source and asserting that all stateful
 * concerns moved into `useOutgoingPair`. Same approach as T13/T14.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const COMPONENT_PATH = resolve(
  __dirname,
  '../../../../src/renderer/features/peers/components/OutgoingPairDialog.tsx',
);
const HOOK_PATH = resolve(
  __dirname,
  '../../../../src/renderer/features/peers/hooks/useOutgoingPair.ts',
);

describe('OutgoingPairDialog (MVP separation)', () => {
  it('imports useOutgoingPair from ../hooks/useOutgoingPair', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).toMatch(
      /import\s*\{[^}]*\buseOutgoingPair\b[^}]*\}\s*from\s*['"]\.\.\/hooks\/useOutgoingPair['"]/,
    );
  });

  it('does NOT call usePairInit or usePairConfirm directly', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/\busePairInit\s*\(/);
    expect(src).not.toMatch(/\busePairConfirm\s*\(/);
  });

  it('does NOT contain pairInit.mutate or pairConfirm.mutate', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/pairInit\.mutate/);
    expect(src).not.toMatch(/pairConfirm\.mutate/);
  });

  it('does NOT contain inline PIN-sanitization regex', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/replaceAll\s*\(\s*\/\\D\/g/);
  });

  it('does NOT call useState directly (state lives in the hook)', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/\buseState\s*[<(]/);
  });

  it('does NOT import from ../api/usePeers (mutations live in the hook)', () => {
    const src = readFileSync(COMPONENT_PATH, 'utf8');
    expect(src).not.toMatch(/['"]\.\.\/api\/usePeers['"]/);
  });
});

describe('useOutgoingPair (presentation hook)', () => {
  it('exists and exports useOutgoingPair', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    expect(src).toMatch(/export\s+function\s+useOutgoingPair\b/);
  });

  it('imports usePairInit and usePairConfirm from ../api/usePeers', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    expect(src).toMatch(/from\s*['"]\.\.\/api\/usePeers['"]/);
    expect(src).toMatch(/\busePairInit\b/);
    expect(src).toMatch(/\busePairConfirm\b/);
  });

  it('uses sanitizePin from ../lib/format', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    expect(src).toMatch(/\bsanitizePin\b/);
    expect(src).toMatch(/from\s*['"]\.\.\/lib\/format['"]/);
  });

  it('exposes the documented Stage type values', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    expect(src).toMatch(/['"]idle['"]/);
    expect(src).toMatch(/['"]awaiting-pin['"]/);
    expect(src).toMatch(/['"]done['"]/);
  });
});
