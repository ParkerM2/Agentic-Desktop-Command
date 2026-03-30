/**
 * AgentLayoutSingle — Main session 60% left, stacked agents 40% right
 *
 * Default layout mode. Project Owner gets the primary view,
 * team agents stack vertically on the right side.
 */

import type { AgentPanelState, AgentSession } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { ScrollArea } from '@ui';

import { AgentPanelCompact } from './AgentPanelCompact';
import { AgentPanelExpanded } from './AgentPanelExpanded';

// ─── Props ─────────────────────────────────────────────────

interface AgentLayoutSingleProps {
  agents: AgentSession[];
  expandedAgentId?: string;
  className?: string;
  onPanelStateChange: (agentId: string, state: AgentPanelState) => void;
  onViewAgent?: (agentId: string) => void;
}

// ─── Component ─────────────────────────────────────────────

export function AgentLayoutSingle({
  agents,
  expandedAgentId,
  className,
  onPanelStateChange,
  onViewAgent,
}: AgentLayoutSingleProps) {
  const mainAgent = agents.length > 0 ? agents[0] : undefined;
  const sideAgents = agents.slice(1);

  if (mainAgent === undefined) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <p className="text-sm text-muted-foreground">No agents active</p>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full gap-3', className)}>
      {/* Main session — 60% left */}
      <div className="flex min-h-0 w-3/5 flex-col">
        <AgentPanelExpanded
          agent={mainAgent}
          className="h-full"
          onCollapse={() => { onPanelStateChange(mainAgent.id, 'compact'); }}
          onPopup={() => { onPanelStateChange(mainAgent.id, 'popup'); }}
          onViewAgent={onViewAgent}
        />
      </div>

      {/* Stacked agents — 40% right */}
      {sideAgents.length > 0 && (
        <ScrollArea className="w-2/5">
          <div className="space-y-2 pr-1">
            {sideAgents.map((agent) => {
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
                  onExpand={() => { onPanelStateChange(agent.id, 'expanded'); }}
                  onPopup={() => { onPanelStateChange(agent.id, 'popup'); }}
                />
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
