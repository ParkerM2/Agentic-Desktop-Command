/** Convert a local file path to a local-file:// URL for Electron's custom protocol */
export function fileUrl(fp: string): string {
  const normalized = fp.replaceAll('\\', '/');
  // Use custom local-file:// protocol registered in main process.
  // Electron blocks file:// from http://localhost in dev mode,
  // so we proxy through a custom scheme that protocol.handle serves.
  return `local-file:///${normalized.replace(/^\/+/, '')}`;
}
