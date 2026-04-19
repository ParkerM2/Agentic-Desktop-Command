/** Convert a local file path to a file:// URL that works in Electron img tags */
export function fileUrl(fp: string): string {
  return `file://${fp.replaceAll('\\', '/')}`;
}
