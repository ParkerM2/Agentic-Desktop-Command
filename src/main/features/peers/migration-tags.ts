import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface JournalEntry {
  idx: number;
  tag: string;
}

interface Journal {
  entries: JournalEntry[];
}

/** Loads the Drizzle migration tags from `drizzle/meta/_journal.json`, sorted by idx. */
export function loadMigrationTags(): string[] {
  // Look in a few spots: dev (process.cwd()), and packaged (__dirname-relative).
  const candidates = [
    resolve(process.cwd(), 'drizzle/meta/_journal.json'),
    resolve(__dirname, '../../../drizzle/meta/_journal.json'),
  ];

  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf8');
      const journal = JSON.parse(raw) as Journal;
      return [...journal.entries].sort((a, b) => a.idx - b.idx).map((e) => e.tag);
    } catch {
      continue;
    }
  }

  throw new Error('drizzle/meta/_journal.json not found in any known location');
}
