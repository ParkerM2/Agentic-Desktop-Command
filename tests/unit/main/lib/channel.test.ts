import { describe, it, expect } from 'vitest';

import { resolveChannel } from '@main/lib/channel';

describe('resolveChannel', () => {
  it('returns explicit env channel when valid', () => {
    expect(resolveChannel({ envChannel: 'local', devMode: false, isPackaged: true })).toBe('local');
    expect(resolveChannel({ envChannel: 'dev',   devMode: false, isPackaged: true })).toBe('dev');
    expect(resolveChannel({ envChannel: 'release', devMode: false, isPackaged: true })).toBe('release');
  });

  it('ignores invalid env channel values and falls through', () => {
    expect(resolveChannel({ envChannel: 'garbage', devMode: false, isPackaged: true })).toBe('release');
  });

  it('returns dev when devMode flag is set', () => {
    expect(resolveChannel({ devMode: true, isPackaged: true })).toBe('dev');
  });

  it('returns dev when app is not packaged', () => {
    expect(resolveChannel({ devMode: false, isPackaged: false })).toBe('dev');
  });

  it('defaults to release for packaged app with no overrides', () => {
    expect(resolveChannel({ devMode: false, isPackaged: true })).toBe('release');
  });

  it('prefers explicit env channel over devMode fallback', () => {
    expect(resolveChannel({ envChannel: 'local', devMode: true, isPackaged: false })).toBe('local');
  });
});
