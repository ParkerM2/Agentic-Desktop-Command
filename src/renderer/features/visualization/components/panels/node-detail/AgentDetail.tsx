/**
 * AgentDetail — detail view for an agent-task node.
 */

import { Badge, MetadataItem, MetadataList, Separator } from '@ui';

import { EventList } from './EventList';
import { SessionLogSection } from './SessionLogSection';
import { statusVariant } from './types';

import type { TrackingEvent } from './types';
import type { AgentTaskData } from '../../../lib/graph-builders';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface AgentDetailProps {
  data: AgentTaskData;
  events: TrackingEvent[];
  eventsLoading: boolean;
  feature: string;
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AgentDetail({ data, events, eventsLoading, feature, projectId }: AgentDetailProps) {
  return (
    <div className="flex flex-col">
      <div className="space-y-4 p-4">
        <MetadataList>
          <MetadataItem label="Agent" value={data.agentName} />
          {data.taskName !== null && (
            <MetadataItem label="Task" value={data.taskName} />
          )}
        </MetadataList>

        <div className="flex flex-wrap gap-2">
          {data.agentRole !== null && (
            <Badge variant="outline">{data.agentRole}</Badge>
          )}
          {data.wave !== null && (
            <Badge variant="secondary">Wave {data.wave}</Badge>
          )}
          <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
        </div>

        {data.fileScope.length > 0 && (
          <MetadataList>
            <MetadataItem
              label="File scope"
              value={
                <div className="flex flex-wrap gap-1">
                  {data.fileScope.map((path) => (
                    <code
                      key={path}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {path}
                    </code>
                  ))}
                </div>
              }
            />
          </MetadataList>
        )}

        <Separator />

        <MetadataList>
          <MetadataItem
            label="Event timeline"
            value={<EventList agentName={data.agentName} events={events} loading={eventsLoading} />}
          />
        </MetadataList>
      </div>

      <SessionLogSection
        agentName={data.agentName}
        feature={feature}
        projectId={projectId}
      />
    </div>
  );
}
