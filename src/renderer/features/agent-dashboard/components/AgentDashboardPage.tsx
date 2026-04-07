/**
 * AgentDashboardPage — Top-level page component
 *
 * Two tabs:
 *   - Agents: existing agent session monitoring UI
 *   - Workflows: template picker + editor + running workflows + launch flow
 */

import { useCallback, useMemo, useState } from 'react';

import { Bot } from 'lucide-react';

import type {
  AgentDashboardFilters,
  AgentDashboardState,
  AgentLayoutMode,
  AgentPanelState,
  AgentSession,
} from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  PageLayout,
  Separator,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@ui';

import { useApplyWorkflow } from '../api/useWorkflowEngine';
import { useWorkflowTemplate } from '../api/useWorkflowTemplates';
import { useAgentDashboardStore } from '../store';

import { AgentLayoutGrid } from './AgentLayoutGrid';
import { AgentLayoutSingle } from './AgentLayoutSingle';
import { AgentLayoutToolbar } from './AgentLayoutToolbar';
import { AgentPanelPopup } from './AgentPanelPopup';
import { RunningWorkflowsPanel } from './RunningWorkflowsPanel';
import { TemplateEditorPanel } from './TemplateEditorPanel';
import { TemplateListPanel } from './TemplateListPanel';

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
  const [agentUiState, setAgentUiState] = useState<AgentDashboardState>({
    layoutMode: 'single',
    filters: {},
  });

  const activeMainTab = useAgentDashboardStore((s) => s.activeMainTab);
  const setActiveMainTab = useAgentDashboardStore((s) => s.setActiveMainTab);

  // ─── Agent panel handlers ─────────────────────────────

  const handleLayoutChange = useCallback((mode: AgentLayoutMode) => {
    setAgentUiState((prev) => ({ ...prev, layoutMode: mode }));
  }, []);

  const handleFilterChange = useCallback((filters: AgentDashboardFilters) => {
    setAgentUiState((prev) => ({ ...prev, filters }));
  }, []);

  const handlePanelStateChange = useCallback(
    (agentId: string, panelState: AgentPanelState) => {
      setAgentUiState((prev) => {
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
              expandedAgentId:
                prev.expandedAgentId === agentId ? undefined : prev.expandedAgentId,
            };
          default:
            return prev;
        }
      });
    },
    [],
  );

  const handleClosePopup = useCallback(() => {
    setAgentUiState((prev) => ({ ...prev, popupAgentId: undefined }));
  }, []);

  const handleViewAgent = useCallback((agentId: string) => {
    setAgentUiState((prev) => ({ ...prev, popupAgentId: agentId }));
  }, []);

  // ─── Filtered Agents ──────────────────────────────────

  const filteredAgents = useMemo(() => {
    let result = agents;
    if (agentUiState.filters.projectId !== undefined) {
      result = result.filter((a) => a.projectId === agentUiState.filters.projectId);
    }
    if (agentUiState.filters.status !== undefined) {
      result = result.filter((a) => a.status === agentUiState.filters.status);
    }
    return result;
  }, [agents, agentUiState.filters]);

  const popupAgent = useMemo(
    () => agents.find((a) => a.id === agentUiState.popupAgentId),
    [agents, agentUiState.popupAgentId],
  );

  // ─── Agents tab empty state ───────────────────────────

  function renderAgentsContent() {
    if (agents.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">No agents running</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a session to see agent activity here
          </p>
        </div>
      );
    }

    return (
      <>
        {agentUiState.layoutMode === 'single' ? (
          <AgentLayoutSingle
            agents={filteredAgents}
            className="h-full"
            expandedAgentId={agentUiState.expandedAgentId}
            onPanelStateChange={handlePanelStateChange}
            onViewAgent={handleViewAgent}
          />
        ) : (
          <AgentLayoutGrid
            agents={filteredAgents}
            className="h-full"
            expandedAgentId={agentUiState.expandedAgentId}
            onPanelStateChange={handlePanelStateChange}
            onViewAgent={handleViewAgent}
          />
        )}
        {popupAgent === undefined ? null : (
          <AgentPanelPopup
            agent={popupAgent}
            open={agentUiState.popupAgentId !== undefined}
            onClose={handleClosePopup}
            onViewAgent={handleViewAgent}
          />
        )}
      </>
    );
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <PageLayout className={className}>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Agent Dashboard</PageHeader.Title>
          {activeMainTab === 'agents' ? (
            <PageHeader.Actions>
              <AgentLayoutToolbar
                filters={agentUiState.filters}
                layoutMode={agentUiState.layoutMode}
                projectOptions={projectOptions}
                onFilterChange={handleFilterChange}
                onLayoutChange={handleLayoutChange}
              />
            </PageHeader.Actions>
          ) : null}
        </PageHeader.Row>
      </PageHeader>

      <div className={cn('min-h-0 flex-1', 'flex flex-col')}>
        <Tabs
          className="flex h-full flex-col"
          value={activeMainTab}
          onValueChange={(v) => setActiveMainTab(v as 'agents' | 'workflows')}
        >
          <div className="shrink-0 px-4">
            <TabsList>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="agents" className="min-h-0 flex-1 p-4">
            {renderAgentsContent()}
          </TabsContent>

          <TabsContent value="workflows" className="min-h-0 flex-1 overflow-auto p-4">
            <WorkflowsTabContent />
          </TabsContent>
        </Tabs>
      </div>

      {/* Template editor dialog — driven by store */}
      <TemplateEditorPanel />

      {/* Launch dialog — driven by store */}
      <LaunchWorkflowDialog />
    </PageLayout>
  );
}

// ─── WorkflowsTabContent ─────────────────────────────────────

function WorkflowsTabContent() {
  return (
    <div className="grid h-full gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <TemplateListPanel />
      <RunningWorkflowsPanel />
    </div>
  );
}

// ─── LaunchWorkflowDialog ────────────────────────────────────

function LaunchWorkflowDialog() {
  const isOpen = useAgentDashboardStore((s) => s.isLaunchDialogOpen);
  const launchTemplateId = useAgentDashboardStore((s) => s.launchTemplateId);
  const closeLaunchDialog = useAgentDashboardStore((s) => s.closeLaunchDialog);

  const { data: template } = useWorkflowTemplate(launchTemplateId);
  const applyWorkflow = useApplyWorkflow();

  const [featureName, setFeatureName] = useState('');
  const [projectPath, setProjectPath] = useState('');

  function handleClose() {
    closeLaunchDialog();
    setFeatureName('');
    setProjectPath('');
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (launchTemplateId === null) return;

    applyWorkflow.mutate(
      {
        templateId: launchTemplateId,
        featureName,
        projectPath,
        overrides: {},
      },
      { onSuccess: () => handleClose() },
    );
  }

  const canSubmit =
    featureName.trim().length > 0 && projectPath.trim().length > 0 && !applyWorkflow.isPending;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Launch Workflow</DialogTitle>
        </DialogHeader>
        <Separator />
        <form id="launch-workflow-form" className="space-y-4 py-2" onSubmit={handleSubmit}>
          {template === undefined ? null : (
            <Text size="sm" variant="muted">
              Template: <span className="font-medium text-foreground">{template.name}</span>
            </Text>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="launch-feature-name">Feature name</Label>
            <Input
              id="launch-feature-name"
              placeholder="my-feature-slug"
              required
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="launch-project-path">Project path</Label>
            <Input
              id="launch-project-path"
              placeholder="/absolute/path/to/project"
              required
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
            />
          </div>

          {applyWorkflow.isError ? (
            <Text size="sm" className="text-destructive">
              Failed to launch workflow. Please try again.
            </Text>
          ) : null}
        </form>
        <Separator />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={applyWorkflow.isPending}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="launch-workflow-form"
            disabled={!canSubmit}
          >
            {applyWorkflow.isPending ? <Spinner size="sm" className="mr-2" /> : null}
            Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
