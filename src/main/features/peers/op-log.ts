import { and, asc, eq, gt } from 'drizzle-orm';

import type { Op } from '@shared/replication/op-types';

import type { AdcDatabase } from '@main/db';
import { opLog as opLogTable } from '@main/features/peers/schema';


export interface OpLogService {
  append: (op: Op) => void;
  readSince: (originPeerId: string, sinceHlc: string | null) => Op[];
}

export function createOpLogService(db: AdcDatabase): OpLogService {
  return {
    append(op) {
      db.insert(opLogTable)
        .values({
          hlc: op.hlc,
          originPeerId: op.originPeerId,
          tableName: op.tableName,
          pk: op.pk,
          opType: op.opType,
          payload: JSON.stringify(op.payload),
          appliedAt: Date.now(),
        })
        .onConflictDoNothing()
        .run();
    },

    readSince(originPeerId, sinceHlc) {
      const whereClause =
        sinceHlc === null
          ? eq(opLogTable.originPeerId, originPeerId)
          : and(eq(opLogTable.originPeerId, originPeerId), gt(opLogTable.hlc, sinceHlc));

      const rows = db
        .select()
        .from(opLogTable)
        .where(whereClause)
        .orderBy(asc(opLogTable.hlc))
        .all();

      return rows.map((r) => ({
        hlc: r.hlc,
        originPeerId: r.originPeerId,
        tableName: r.tableName as Op['tableName'],
        pk: r.pk,
        opType: r.opType,
        payload: JSON.parse(r.payload) as Op['payload'],
      }));
    },
  };
}
