/**
 * Command History Store
 *
 * Persists the last 1000 assistant command entries to the command_history
 * SQLite table. Entries include input, response summary, and timestamp —
 * never raw API keys or tokens.
 */

import { asc, desc, sql } from 'drizzle-orm';

import type { CommandHistoryEntry } from '@shared/types';

import type { AdcDatabase } from '@main/db';
import type { ReinitializableService } from '@main/features/data-management';
import { serviceLogger } from '@main/lib/logger';

import { commandHistory } from './schema';

const MAX_HISTORY_ENTRIES = 1000;

export interface HistoryStore extends ReinitializableService {
  /** Get the most recent entries, newest first. */
  getEntries: (limit?: number) => CommandHistoryEntry[];
  /** Add a new entry to the history. */
  addEntry: (entry: CommandHistoryEntry) => void;
  /** Clear all history entries. */
  clear: () => void;
}

export function createHistoryStore(deps: { db: AdcDatabase }): HistoryStore {
  const { db } = deps;

  return {
    getEntries(limit) {
      const query = db
        .select()
        .from(commandHistory)
        .orderBy(desc(commandHistory.timestamp));

      const rows = (limit !== undefined && limit > 0 ? query.limit(limit) : query).all();

      return rows.map((row) => ({
        id: row.id,
        input: row.input,
        responseSummary: row.responseSummary,
        timestamp: row.timestamp,
      }));
    },

    addEntry(entry) {
      const { id } = entry;
      db.insert(commandHistory)
        .values({
          id,
          input: entry.input,
          responseSummary: entry.responseSummary,
          timestamp: entry.timestamp,
        })
        .run();

      // Trim to max entries
      const countRow = db
        .select({ count: sql<number>`count(*)` })
        .from(commandHistory)
        .get();

      if (countRow && countRow.count > MAX_HISTORY_ENTRIES) {
        const oldest = db
          .select({ id: commandHistory.id })
          .from(commandHistory)
          .orderBy(asc(commandHistory.timestamp))
          .limit(countRow.count - MAX_HISTORY_ENTRIES)
          .all();

        for (const row of oldest) {
          db.delete(commandHistory)
            .where(sql`${commandHistory.id} = ${row.id}`)
            .run();
        }
      }
    },

    clear() {
      db.delete(commandHistory).run();
    },

    reinitialize(_dataDir: string) {
      serviceLogger.info('[HistoryStore] reinitialize called — SQLite store, no action needed');
    },

    clearState() {
      db.delete(commandHistory).run();
    },
  };
}
