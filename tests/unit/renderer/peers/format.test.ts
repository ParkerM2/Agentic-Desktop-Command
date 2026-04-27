/**
 * Unit tests for the peer-domain string formatters.
 *
 * Pure functions, no DOM required — exercised directly.
 */

import { describe, it, expect } from 'vitest';

import { peerLabel, sanitizePin, truncate } from '../../../../src/renderer/features/peers/lib/format';
import { PIN_LENGTH } from '../../../../src/shared/ipc/peers';

describe('truncate', () => {
  it('returns the value unchanged when shorter than max', () => {
    expect(truncate('abc', 16)).toBe('abc');
  });

  it('returns the value unchanged when exactly max length', () => {
    expect(truncate('abcdefghijklmnop', 16)).toBe('abcdefghijklmnop');
  });

  it('clips and appends an ellipsis when longer than max', () => {
    expect(truncate('abcdefghijklmnopqrstuv', 16)).toBe('abcdefghijklmnop…');
  });

  it('defaults to 16 chars when max is omitted', () => {
    const long = 'a'.repeat(20);
    const out = truncate(long);
    expect(out).toBe(`${'a'.repeat(16)}…`);
  });

  it('handles the empty string', () => {
    expect(truncate('', 16)).toBe('');
  });
});

describe('peerLabel', () => {
  it('returns displayName when set', () => {
    expect(peerLabel({ displayName: 'Foo', peerId: 'aaaaaaaaaaaaaaaaaaaa' })).toBe('Foo');
  });

  it('returns truncated peerId when displayName is null', () => {
    const peerId = 'a'.repeat(20);
    expect(peerLabel({ displayName: null, peerId })).toBe(truncate(peerId, 16));
  });

  it('returns short peerId untouched when displayName is null', () => {
    expect(peerLabel({ displayName: null, peerId: 'short' })).toBe('short');
  });

  it('does NOT fall back to truncate when displayName is empty string', () => {
    // Documented: only `null` triggers the fallback. Empty string is a real value.
    expect(peerLabel({ displayName: '', peerId: 'aaaaaaaa' })).toBe('');
  });
});

describe('sanitizePin', () => {
  it('strips dashes from a hyphen-separated PIN', () => {
    expect(sanitizePin('1-2-3-4-5-6-7')).toBe('123456');
  });

  it('strips whitespace and non-digit chars', () => {
    expect(sanitizePin('  abcd1 2x3  ')).toBe('123');
  });

  it('clamps to PIN_LENGTH', () => {
    const long = '1234567890';
    expect(sanitizePin(long)).toHaveLength(PIN_LENGTH);
    expect(sanitizePin(long)).toBe('123456');
  });

  it('returns empty string when no digits are present', () => {
    expect(sanitizePin('abcdef')).toBe('');
  });

  it('handles the empty input', () => {
    expect(sanitizePin('')).toBe('');
  });
});

describe('PIN_LENGTH constant', () => {
  it('is exported as 6 from @shared/ipc/peers', () => {
    expect(PIN_LENGTH).toBe(6);
  });
});
