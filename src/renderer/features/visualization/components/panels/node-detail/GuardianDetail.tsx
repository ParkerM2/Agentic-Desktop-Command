/**
 * GuardianDetail — detail view for a guardian node.
 */

import { Badge, MetadataItem, MetadataList, Separator } from '@ui';

import { EventList } from './EventList';
import { statusVariant } from './types';

import type { TrackingEvent } from './types';
import type { AgentTaskData } from '../../../lib/graph-builders';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface GuardianDetailProps {
  data: AgentTaskData;
  events: TrackingEvent[];
  eventsLoading: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GuardianDetail({ data, events, eventsLoading }: GuardianDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <MetadataList>
        <MetadataItem label="Guardian agent" value={data.agentName} />
        {data.taskName !== null && (
          <MetadataItem label="Feature" value={data.taskName} />
        )}
      </MetadataList>

      <Badge variant={statusVariant(data.status)}>{data.status}</Badge>

      <Separator />

      <MetadataList>
        <MetadataItem
          label="Events"
          value={<EventList agentName={data.agentName} events={events} loading={eventsLoading} />}
        />
      </MetadataList>
    </div>
  );
}
