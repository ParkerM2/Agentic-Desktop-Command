/**
 * AgentDashboardPage — Top-level page component
 *
 * Renders toolbar + selected layout.
 * Manages which panel is expanded/popup.
 * Uses placeholder data until task-8 (hooks) is completed.
 */

import { useState, useCallback, useMemo } from 'react';

import { Bot } from 'lucide-react';

import type {
  AgentDashboardFilters,
  AgentDashboardState,
  AgentLayoutMode,
  AgentPanelState,
  AgentSession,
} from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { Separator } from '@ui';

import { AgentLayoutGrid } from './AgentLayoutGrid';
import { AgentLayoutSingle } from './AgentLayoutSingle';
import { AgentLayoutToolbar } from './AgentLayoutToolbar';
import { AgentPanelPopup } from './AgentPanelPopup';

// ─── Props ─────────────────────────────────────────────────

interface AgentDashboardPageProps {
  agents?: AgentSession[];
  projectOptions?: Array<{ id: string; name: string }>;
  className?: string;
}

// ─── Component ─────────────────────────────────────────────

export function AgentDashboardPage({
  agents = [],
  projectOptions = [],
  className,
}: AgentDashboardPageProps) {
  const [state, setState] = useState<AgentDashboardState>({
    layoutMode: 'single',
    filters: {},
  });

  // ─── Handlers ──────────────────────────────────────────

  const handleLayoutChange = useCallback((mode: AgentLayoutMode) => {
    setState((prev) => ({ ...prev, layoutMode: mode }));
  }, []);

  const handleFilterChange = useCallback((filters: AgentDashboardFilters) => {
    setState((prev) => ({ ...prev, filters }));
  }, []);

  const handlePanelStateChange = useCallback((agentId: string, panelState: AgentPanelState) => {
    setState((prev) => {
      switch (panelState) {
        case 'expanded':
          return {
            ...prev,
            expandedAgentId: prev.expandedAgentId === agentId ? undefined : agentId,
          };
        case 'popup':
          return { ...prev, popupAgentId: agentId };
        case 'compact':
          return {
            ...prev,
            expandedAgentId: prev.expandedAgentId === agentId ? undefined : prev.expandedAgentId,
          };
        default:
          return prev;
      }
    });
  }, []);

  const handleClosePopup = useCallback(() => {
    setState((prev) => ({ ...prev, popupAgentId: undefined }));
  }, []);

  const handleViewAgent = useCallback((agentId: string) => {
    setState((prev) => ({ ...prev, popupAgentId: agentId }));
  }, []);

  // ─── Filtered Agents ──────────────────────────────────

  const filteredAgents = useMemo(() => {
    let result = agents;
    if (state.filters.projectId !== undefined) {
      result = result.filter((a) => a.projectId === state.filters.projectId);
    }
    if (state.filters.status !== undefined) {
      result = result.filter((a) => a.status === state.filters.status);
    }
    return result;
  }, [agents, state.filters]);

  const popupAgent = useMemo(
    () => agents.find((a) => a.id === state.popupAgentId),
    [agents, state.popupAgentId],
  );

  // ─── Empty State ───────────────────────────────────────

  if (agents.length === 0) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center', className)}>
        <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">No agents running</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a session to see agent activity here
        </p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Toolbar */}
      <div className="shrink-0 px-4 py-3">
        <AgentLayoutToolbar
          filters={state.filters}
          layoutMode={state.layoutMode}
          projectOptions={projectOptions}
          onFilterChange={handleFilterChange}
          onLayoutChange={handleLayoutChange}
        />
      </div>

      <Separator />

      {/* Layout Content */}
      <div className="min-h-0 flex-1 p-4">
        {state.layoutMode === 'single' ? (
          <AgentLayoutSingle
            agents={filteredAgents}
            className="h-full"
            expandedAgentId={state.expandedAgentId}
            onPanelStateChange={handlePanelStateChange}
            onViewAgent={handleViewAgent}
          />
        ) : (
          <AgentLayoutGrid
            agents={filteredAgents}
            className="h-full"
            expandedAgentId={state.expandedAgentId}
            onPanelStateChange={handlePanelStateChange}
            onViewAgent={handleViewAgent}
          />
        )}
      </div>

      {/* Popup Modal */}
      {popupAgent !== undefined && (
        <AgentPanelPopup
          agent={popupAgent}
          open={state.popupAgentId !== undefined}
          onClose={handleClosePopup}
          onViewAgent={handleViewAgent}
        />
      )}
    </div>
  );
}
