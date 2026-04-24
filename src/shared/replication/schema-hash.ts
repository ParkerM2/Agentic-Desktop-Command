/** SHA-256 of the newline-joined migration tag list. Stable across platforms. */
export async function computeSchemaHash(migrationTags: readonly string[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(migrationTags.join('\n'));
  const buf = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}
