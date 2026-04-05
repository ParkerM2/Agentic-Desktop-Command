/**
 * AgentDetail — detail view for an agent-task node.
 */

import { Badge, Separator } from '@ui';

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
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Agent</p>
          <p className="text-sm font-medium">{data.agentName}</p>
        </div>

        {data.taskName !== null && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Task</p>
            <p className="text-sm">{data.taskName}</p>
          </div>
        )}

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
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">File scope</p>
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
          </div>
        )}

        <Separator />

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Event timeline</p>
          <EventList agentName={data.agentName} events={events} loading={eventsLoading} />
        </div>
      </div>

      <SessionLogSection
        agentName={data.agentName}
        feature={feature}
        projectId={projectId}
      />
    </div>
  );
}
