import { randomUUID } from 'node:crypto';

/** Generate a UUID v4. Use in main process services. */
export function generateId(): string {
  return randomUUID();
}
