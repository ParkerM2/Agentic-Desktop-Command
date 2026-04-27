import { createHash } from 'node:crypto';

/** SHA-256 of the newline-joined migration tag list. Stable across platforms. */
export function computeSchemaHash(migrationTags: readonly string[]): string {
  return createHash('sha256').update(migrationTags.join('\n')).digest('hex');
}
