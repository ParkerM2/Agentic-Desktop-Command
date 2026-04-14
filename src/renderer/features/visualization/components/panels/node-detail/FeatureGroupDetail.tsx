/**
 * FeatureGroupDetail — detail view for a feature-group node.
 * Shows: metadata, file list, active agents, and session log.
 */



import type { AgentTaskInfoSchema, CodebaseFileSchema } from '@shared/ipc/visualization/schemas';

import { Badge, MetadataItem, MetadataList, Text } from '@ui';


import { SessionLogSection } from './SessionLogSection';
import { statusVariant } from './types';

import type { FeatureGroupData } from '../../../lib/graph-builders';
import type { z } from 'zod';

type AgentTaskInfo = z.infer<typeof AgentTaskInfoSchema>;
type CodebaseFile = z.infer<typeof CodebaseFileSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FeatureGroupDetailProps {
  agentTasks: AgentTaskInfo[];
  data: FeatureGroupData;
  files: CodebaseFile[];
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FeatureGroupDetail({ agentTasks, data, files, projectId }: FeatureGroupDetailProps) {
  const activeAgents = agentTasks.filter((t) => t.status === 'active');

  return (
    <div className="space-y-4 p-4">
      <MetadataList>
        <MetadataItem label="Feature" value={data.feature} />
        <MetadataItem
          label="Status"
          value={<Badge variant={statusVariant(data.status)}>{data.status}</Badge>}
        />
        {data.branch !== null && (
          <MetadataItem
            label="Branch"
            value={
              <code className="block rounded bg-muted px-2 py-1 font-mono text-xs">
                {data.branch}
              </code>
            }
          />
        )}
        <MetadataItem label="Agents" value={data.agentCount} />
      </MetadataList>

      {/* Active Agents */}
      {activeAgents.length > 0 && (
        <section>
          <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Active Agents
          </Text>
          <ul className="space-y-1">
            {activeAgents.map((agent) => (
              <li
                key={agent.agentName}
                className="flex items-center justify-between rounded bg-muted/30 px-2 py-1 text-xs"
              >
                <span className="font-medium">{agent.agentName}</span>
                {agent.wave !== null && (
                  <span className="text-muted-foreground">Wave {agent.wave}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Files */}
      {files.length > 0 && (
        <section>
          <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Files ({files.length})
          </Text>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto">
            {files.map((f) => (
              <li
                key={f.path}
                className="truncate rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted/50"
              >
                {f.relativePath}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Session Logs for active agents */}
      {activeAgents.map((agent) => (
        <SessionLogSection
          key={agent.agentName}
          agentName={agent.agentName}
          feature={data.feature}
          projectId={projectId}
        />
      ))}
    </div>
  );
}
