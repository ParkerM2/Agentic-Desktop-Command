import { describe, expect, it } from 'vitest';

import { HostnameSchema } from '@shared/ipc/peers';

describe('HostnameSchema', () => {
  it('accepts plain hostname', () => {
    expect(() => HostnameSchema.parse('localhost')).not.toThrow();
  });

  it('accepts IPv4', () => {
    expect(() => HostnameSchema.parse('192.168.1.5')).not.toThrow();
  });

  it('accepts IPv6 loopback', () => {
    expect(() => HostnameSchema.parse('::1')).not.toThrow();
  });

  it('accepts IPv6 with zone id', () => {
    expect(() => HostnameSchema.parse('fe80::1%eth0')).not.toThrow();
  });

  it('accepts bracketed IPv6', () => {
    expect(() => HostnameSchema.parse('[::1]')).not.toThrow();
  });

  it('rejects URL with path', () => {
    expect(() => HostnameSchema.parse('evil.com/path?x=1')).toThrow();
  });

  it('rejects URL with scheme', () => {
    expect(() => HostnameSchema.parse('http://evil.com')).toThrow();
  });

  it('rejects strings with whitespace', () => {
    expect(() => HostnameSchema.parse('foo bar')).toThrow();
  });

  it('rejects strings longer than 255 chars', () => {
    expect(() => HostnameSchema.parse('a'.repeat(256))).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => HostnameSchema.parse('')).toThrow();
  });
});
