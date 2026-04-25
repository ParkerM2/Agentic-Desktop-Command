/** Truncate a value (e.g. peerId, fingerprint) to N chars + ellipsis. */
export function truncate(value: string, max = 16): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}
