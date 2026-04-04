/**
 * NodeDetailPanel — slide-in detail panel for selected canvas nodes.
 * Shows different content based on node type: file, fileGroup, agentTask, or guardian.
 */

import { type ReactNode, useState } from 'react';

import { useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Badge, Button, ScrollArea, Separator, Skeleton } from '@ui';

import { useAgentTeams, useSessionLog } from '../../api/visualization-api';
import { useVisualizationStore } from '../../store';

import type {
  AgentTaskData,
  FeatureGroupData,
  FileGroupData,
  FileNodeData,
} from '../../lib/graph-builders';
import type { Node } from '@xyflow/react';

// ─── Status badge variant helpers ────────────────────────────────────────────

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active': {
      return 'default';
    }
    case 'completed': {
      return 'secondary';
    }
    case 'error': {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
}

// ─── File node detail ─────────────────────────────────────────────────────────

interface FileDetailProps {
  data: FileNodeData;
  exports: string[];
  imports: string[];
}

function FileDetail({ data, exports, imports }: FileDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Path</p>
        <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
          {data.relativePath}
        </code>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Group</p>
        <p className="text-sm">{data.group}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Import count</p>
        <p className="text-sm">{data.importCount}</p>
      </div>

      {imports.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Imports from</p>
          <ul className="space-y-0.5">
            {imports.map((imp) => (
              <li key={imp}>
                <code className="block truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
                  {imp}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {exports.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Exported to</p>
          <ul className="space-y-0.5">
            {exports.map((exp) => (
              <li key={exp}>
                <code className="block truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
                  {exp}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── FileGroup node detail ────────────────────────────────────────────────────

interface FileGroupDetailProps {
  data: FileGroupData;
}

function FileGroupDetail({ data }: FileGroupDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Group</p>
        <p className="text-sm">{data.label}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Files</p>
        <p className="text-sm">{data.fileCount}</p>
      </div>
    </div>
  );
}

// ─── Session log section ──────────────────────────────────────────────────────

interface SessionLogSectionProps {
  agentName: string;
  feature: string;
  projectId: string;
}

function SessionLogSection({ agentName, feature, projectId }: SessionLogSectionProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>();

  const { data, isLoading } = useSessionLog(
    open ? projectId : '',
    open ? feature : '',
    open ? agentName : '',
    cursor,
  );

  return (
    <div className="border-t border-border">
      <Button
        className="w-full justify-between rounded-none px-4 py-2 text-xs"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
      >
        <span>Session Log</span>
        <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
      </Button>

      {open ? (
        <div className="px-4 pb-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : null}

          {!isLoading && data?.sessionFile === null ? (
            <p className="text-xs text-muted-foreground">No session file found</p>
          ) : null}

          {!isLoading && data?.sessionFile !== null && data !== undefined ? (
            <>
              <ScrollArea className="h-48 rounded border border-border bg-muted/30">
                <div className="p-2">
                  {data.lines.map((line) => (
                    <pre
                      key={line.index}
                      className="whitespace-pre-wrap break-all font-mono text-xs text-foreground/80"
                    >
                      {line.raw}
                    </pre>
                  ))}
                </div>
              </ScrollArea>

              <Button
                className="mt-2 w-full text-xs"
                disabled={data.cursor === -1}
                size="sm"
                variant="outline"
                onClick={() => {
                  setCursor(data.cursor);
                }}
              >
                Load more
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── Event list shared component ─────────────────────────────────────────────

interface TrackingEvent {
  agent: string | null;
  data: Record<string, unknown>;
  sid: string;
  ts: string;
  type: string;
}

interface EventListProps {
  agentName: string;
  events: TrackingEvent[];
  loading: boolean;
}

function EventList({ agentName, events, loading }: EventListProps) {
  const filtered = events.filter((e) => e.agent === agentName || e.agent === null);

  if (loading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground">No events recorded</p>;
  }

  return (
    <ScrollArea className="h-48 rounded border border-border">
      <div className="space-y-1 p-2">
        {filtered.map((event, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`${event.ts}-${idx}`}
            className="flex items-start gap-2 text-xs"
          >
            <span className="shrink-0 text-muted-foreground">
              {new Date(event.ts).toLocaleTimeString()}
            </span>
            <span className="break-all text-foreground/80">{event.type}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ─── Agent task node detail ───────────────────────────────────────────────────

interface AgentDetailProps {
  data: AgentTaskData;
  events: TrackingEvent[];
  eventsLoading: boolean;
  feature: string;
  projectId: string;
}

function AgentDetail({ data, events, eventsLoading, feature, projectId }: AgentDetailProps) {
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

// ─── Guardian node detail ─────────────────────────────────────────────────────

interface GuardianDetailProps {
  data: AgentTaskData;
  events: TrackingEvent[];
  eventsLoading: boolean;
}

function GuardianDetail({ data, events, eventsLoading }: GuardianDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Guardian agent</p>
        <p className="text-sm font-medium">{data.agentName}</p>
      </div>

      {data.taskName !== null && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Feature</p>
          <p className="text-sm">{data.taskName}</p>
        </div>
      )}

      <Badge variant={statusVariant(data.status)}>{data.status}</Badge>

      <Separator />

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Events</p>
        <EventList agentName={data.agentName} events={events} loading={eventsLoading} />
      </div>
    </div>
  );
}

// ─── Feature group node detail ────────────────────────────────────────────────

interface FeatureGroupDetailProps {
  data: FeatureGroupData;
}

function FeatureGroupDetail({ data }: FeatureGroupDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Feature</p>
        <p className="text-sm font-medium">{data.feature}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Status</p>
        <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
      </div>
      {data.branch !== null && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Branch</p>
          <code className="block rounded bg-muted px-2 py-1 font-mono text-xs">
            {data.branch}
          </code>
        </div>
      )}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Agents</p>
        <p className="text-sm">{data.agentCount}</p>
      </div>
    </div>
  );
}

// ─── Panel title ──────────────────────────────────────────────────────────────

function getPanelTitle(node: Node | undefined): string {
  if (node === undefined) return 'Node Detail';
  switch (node.type) {
    case 'file': {
      return (node.data as unknown as FileNodeData).label;
    }
    case 'fileGroup': {
      return (node.data as unknown as FileGroupData).label;
    }
    case 'agentTask':
    case 'guardian': {
      return (node.data as unknown as AgentTaskData).agentName;
    }
    case 'featureGroup': {
      return (node.data as unknown as FeatureGroupData).label;
    }
    case undefined:
    default: {
      return 'Node Detail';
    }
  }
}

// ─── Node content renderer ───────────────────────────────────────────────────

interface NodeContentContext {
  agentTeamsLoading: boolean;
  featureEvents: TrackingEvent[];
  featureName: string;
  getFileEdges: (path: string) => { exports: string[]; imports: string[] };
  projectId: string;
}

function renderNodeContent(
  node: Node | undefined,
  ctx: NodeContentContext,
): ReactNode {
  if (node === undefined) return null;
  const { agentTeamsLoading, featureEvents, featureName, getFileEdges, projectId } = ctx;

  switch (node.type) {
    case 'file': {
      const data = node.data as unknown as FileNodeData;
      const edges = getFileEdges(data.path);
      return <FileDetail data={data} exports={edges.exports} imports={edges.imports} />;
    }
    case 'fileGroup': {
      return <FileGroupDetail data={node.data as unknown as FileGroupData} />;
    }
    case 'agentTask': {
      return (
        <AgentDetail
          data={node.data as unknown as AgentTaskData}
          events={featureEvents}
          eventsLoading={agentTeamsLoading}
          feature={featureName}
          projectId={projectId}
        />
      );
    }
    case 'guardian': {
      return (
        <GuardianDetail
          data={node.data as unknown as AgentTaskData}
          events={featureEvents}
          eventsLoading={agentTeamsLoading}
        />
      );
    }
    case 'featureGroup': {
      return <FeatureGroupDetail data={node.data as unknown as FeatureGroupData} />;
    }
    case undefined:
    default: {
      return null;
    }
  }
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface NodeDetailPanelProps {
  projectId: string;
}

export function NodeDetailPanel({ projectId }: NodeDetailPanelProps) {
  const { closeDetailPanel, detailPanelOpen, selectedFeature, selectedNodeId } =
    useVisualizationStore();

  const { getEdges, getNode } = useReactFlow();

  const node: Node | undefined =
    selectedNodeId === null ? undefined : getNode(selectedNodeId);

  const { data: agentTeamsData, isLoading: agentTeamsLoading } = useAgentTeams(projectId);

  const featureName = selectedFeature ?? agentTeamsData?.features[0]?.feature ?? '';
  const featureData = agentTeamsData?.features.find((f) => f.feature === featureName);
  const featureEvents: TrackingEvent[] = featureData?.events ?? [];

  function getFileEdges(nodePath: string) {
    const edges = getEdges();
    const imports = edges.filter((e) => e.source === nodePath).map((e) => e.target);
    const exports = edges.filter((e) => e.target === nodePath).map((e) => e.source);
    return { exports, imports };
  }

  const shouldRender = selectedNodeId !== null && detailPanelOpen && node !== undefined;

  return (
    <aside
      aria-hidden={!detailPanelOpen}
      aria-label="Node detail panel"
      className={cn(
        'absolute top-0 right-0 z-10 h-full w-[380px] bg-card border-l border-border shadow-xl',
        'flex flex-col',
        'transition-transform duration-300',
        detailPanelOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h3 className="truncate text-sm font-semibold">{getPanelTitle(node)}</h3>
        <Button
          aria-label="Close detail panel"
          size="icon"
          variant="ghost"
          onClick={closeDetailPanel}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      {shouldRender ? (
        <ScrollArea className="flex-1">
          {renderNodeContent(node, {
            featureEvents,
            agentTeamsLoading,
            featureName,
            projectId,
            getFileEdges,
          })}
        </ScrollArea>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">Select a node to view details</p>
        </div>
      )}
    </aside>
  );
}
