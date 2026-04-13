/**
 * AgentLayoutGrid — Equal-sized cells, auto-wrap by window width
 *
 * All agents displayed in equal-sized grid cells.
 * Uses CSS grid with auto-fill for responsive wrapping.
 */

import type { AgentPanelState, AgentSession } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { ScrollArea } from '@ui';

import { AgentPanelCompact } from './AgentPanelCompact';
import { AgentPanelExpanded } from './AgentPanelExpanded';

// ─── Props ─────────────────────────────────────────────────

interface AgentLayoutGridProps {
  agents: AgentSession[];
  expandedAgentId?: string;
  className?: string;
  pendingStopIds?: Set<string>;
  onPanelStateChange: (agentId: string, state: AgentPanelState) => void;
  onStop?: (agentId: string) => void;
  onViewAgent?: (agentId: string) => void;
}

// ─── Component ─────────────────────────────────────────────

export function AgentLayoutGrid({
  agents,
  expandedAgentId,
  className,
  pendingStopIds,
  onPanelStateChange,
  onStop,
  onViewAgent,
}: AgentLayoutGridProps) {
  if (agents.length === 0) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <p className="text-sm text-muted-foreground">No agents active</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div
        className="grid gap-3 p-1"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        }}
      >
        {agents.map((agent) => {
          const isExpanded = expandedAgentId === agent.id;

          if (isExpanded) {
            return (
              <AgentPanelExpanded
                key={agent.id}
                agent={agent}
                className="h-[400px]"
                onCollapse={() => { onPanelStateChange(agent.id, 'compact'); }}
                onPopup={() => { onPanelStateChange(agent.id, 'popup'); }}
                onViewAgent={onViewAgent}
              />
            );
          }

          return (
            <AgentPanelCompact
              key={agent.id}
              agent={agent}
              isStopPending={pendingStopIds?.has(agent.id) ?? false}
              onExpand={() => { onPanelStateChange(agent.id, 'expanded'); }}
              onPopup={() => { onPanelStateChange(agent.id, 'popup'); }}
              onStop={onStop === undefined ? undefined : () => { onStop(agent.id); }}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
