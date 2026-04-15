/**
 * AgentDashboardPage — Top-level page component
 *
 * Two tabs:
 *   - Agents: existing agent session monitoring UI
 *   - Workflows: template picker + editor + running workflows + launch flow
 */

import { useCallback, useMemo, useState } from 'react';

import { Bot, Search, Square } from 'lucide-react';

import type {
  AgentDashboardFilters,
  AgentDashboardState,
  AgentLayoutMode,
  AgentPanelState,
  AgentSession,
  AgentSessionType,
  AgentStatus,
} from '@shared/types/agent-dashboard';

import { useDebounce } from '@renderer/shared/hooks/useDebounce';
import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@ui';

import { useStopSession } from '../api/useAgentMutations';
import { useAgentSessions } from '../api/useAgentSessions';
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

// ─── Constants ─────────────────────────────────────────────

const SESSION_TYPE_OPTIONS: Array<{ value: AgentSessionType | 'all'; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'project-owner', label: 'Project owner' },
  { value: 'team-lead', label: 'Team lead' },
  { value: 'teammate', label: 'Teammate' },
];

const STATUS_OPTIONS: Array<{ value: AgentStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'idle', label: 'Idle' },
];

// ─── Local filter state ─────────────────────────────────────

interface SessionFilterState {
  sessionType: AgentSessionType | 'all';
  status: AgentStatus | 'all';
  teamName: string;
  search: string;
}

// ─── Props ─────────────────────────────────────────────────

interface AgentDashboardPageProps {
  /** If omitted, the component self-fetches via useAgentSessions() */
  agents?: AgentSession[];
  projectOptions?: Array<{ id: string; name: string }>;
  className?: string;
}

// ─── Component ─────────────────────────────────────────────

export function AgentDashboardPage({
  agents: agentsProp,
  projectOptions = [],
  className,
}: AgentDashboardPageProps) {
  const { data: fetchedAgents = [] } = useAgentSessions();
  const agents = agentsProp ?? fetchedAgents;
  const [agentUiState, setAgentUiState] = useState<AgentDashboardState>({
    layoutMode: 'single',
    filters: {},
  });

  const [sessionFilters, setSessionFilters] = useState<SessionFilterState>({
    sessionType: 'all',
    status: 'all',
    teamName: 'all',
    search: '',
  });

  const debouncedSearch = useDebounce(sessionFilters.search, 250);

  const [isStopAllDialogOpen, setIsStopAllDialogOpen] = useState(false);
  const [pendingStopIds, setPendingStopIds] = useState<Set<string>>(new Set());

  const stopSession = useStopSession();


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

  const handleStopSession = useCallback(
    (agentId: string) => {
      setPendingStopIds((prev) => new Set([...prev, agentId]));
      stopSession.mutate(
        { sessionId: agentId },
        {
          onSettled: () => {
            setPendingStopIds((prev) => {
              const next = new Set(prev);
              next.delete(agentId);
              return next;
            });
          },
        },
      );
    },
    [stopSession],
  );

  function handleStopAll() {
    runningAgents.forEach((a) => {
      handleStopSession(a.id);
    });
    setIsStopAllDialogOpen(false);
  }


  // ─── Team name options ────────────────────────────────

  const teamNameOptions = useMemo(() => {
    const names = Array.from(
      new Set(agents.map((a) => a.teamName).filter((n): n is string => n !== undefined && n !== ''))
    );
    return names;
  }, [agents]);

  // ─── Filtered Agents ──────────────────────────────────

  const filteredAgents = useMemo(() => {
    let result = agents;

    // Existing IPC-backed filters
    if (agentUiState.filters.projectId !== undefined) {
      result = result.filter((a) => a.projectId === agentUiState.filters.projectId);
    }
    if (agentUiState.filters.status !== undefined) {
      result = result.filter((a) => a.status === agentUiState.filters.status);
    }

    // New client-side filters
    if (sessionFilters.sessionType !== 'all') {
      result = result.filter((a) => a.type === sessionFilters.sessionType);
    }
    if (sessionFilters.status !== 'all') {
      result = result.filter((a) => a.status === sessionFilters.status);
    }
    if (sessionFilters.teamName !== 'all') {
      result = result.filter((a) => a.teamName === sessionFilters.teamName);
    }
    if (debouncedSearch.trim().length > 0) {
      const query = debouncedSearch.trim().toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(query));
    }

    return result;
  }, [agents, agentUiState.filters, sessionFilters, debouncedSearch]);

  const runningAgents = useMemo(() => agents.filter((a) => a.status === 'running'), [agents]);

  const hasRunningAgents = runningAgents.length > 0;

  const popupAgent = useMemo(
    () => agents.find((a) => a.id === agentUiState.popupAgentId),
    [agents, agentUiState.popupAgentId],
  );

  // ─── Agents tab filter bar ────────────────────────────

  function renderSessionFilterBar() {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        {/* Session type filter */}
        <Select
          value={sessionFilters.sessionType}
          onValueChange={(v) =>
            setSessionFilters((prev) => ({
              ...prev,
              sessionType: v as AgentSessionType | 'all',
            }))
          }
        >
          <SelectTrigger aria-label="Filter by session type" className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {SESSION_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={sessionFilters.status}
          onValueChange={(v) =>
            setSessionFilters((prev) => ({
              ...prev,
              status: v as AgentStatus | 'all',
            }))
          }
        >
          <SelectTrigger aria-label="Filter by status" className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Team name filter */}
        <Select
          value={sessionFilters.teamName}
          onValueChange={(v) =>
            setSessionFilters((prev) => ({ ...prev, teamName: v }))
          }
        >
          <SelectTrigger aria-label="Filter by team" className="w-40">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teamNameOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search by session name */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search sessions by name"
            className="pl-9"
            placeholder="Search sessions..."
            type="text"
            value={sessionFilters.search}
            onChange={(e) =>
              setSessionFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
      </div>
    );
  }

  // ─── Agents tab empty state ───────────────────────────

  function renderAgentsContent() {
    if (agents.length === 0) {
      return (
        <>
          {renderSessionFilterBar()}
          <div className="flex flex-1 flex-col items-center justify-center">
            <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
            <Text className="text-lg font-medium text-foreground">No agents running</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Start a session to see agent activity here
            </Text>
          </div>
        </>
      );
    }

    return (
      <>
        {renderSessionFilterBar()}
        <div className="min-h-0 flex-1 p-4">
          {agentUiState.layoutMode === 'single' ? (
            <AgentLayoutSingle
              agents={filteredAgents}
              className="h-full"
              expandedAgentId={agentUiState.expandedAgentId}
              pendingStopIds={pendingStopIds}
              onPanelStateChange={handlePanelStateChange}
              onStop={handleStopSession}
              onViewAgent={handleViewAgent}
            />
          ) : (
            <AgentLayoutGrid
              agents={filteredAgents}
              className="h-full"
              expandedAgentId={agentUiState.expandedAgentId}
              pendingStopIds={pendingStopIds}
              onPanelStateChange={handlePanelStateChange}
              onStop={handleStopSession}
              onViewAgent={handleViewAgent}
            />
          )}
        </div>
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
              {hasRunningAgents ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsStopAllDialogOpen(true)}
                >
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  Stop All ({runningAgents.length})
                </Button>
              ) : null}
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

          <TabsContent className="flex min-h-0 flex-1 flex-col" value="agents">
            {renderAgentsContent()}
          </TabsContent>

          <TabsContent className="min-h-0 flex-1 overflow-auto p-4" value="workflows">
            <WorkflowsTabContent />
          </TabsContent>
        </Tabs>
      </div>

      {/* Stop All confirmation dialog */}
      <Dialog
        open={isStopAllDialogOpen}
        onOpenChange={(open) => {
          if (!open) setIsStopAllDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Stop all sessions?</DialogTitle>
            <DialogDescription>
              This will stop {runningAgents.length} running{' '}
              {runningAgents.length === 1 ? 'session' : 'sessions'}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStopAllDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleStopAll}
            >
              Stop All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <form className="space-y-4 py-2" id="launch-workflow-form" onSubmit={handleSubmit}>
          {template === undefined ? null : (
            <Text size="sm" variant="muted">
              Template: <span className="font-medium text-foreground">{template.name}</span>
            </Text>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="launch-feature-name">Feature name</Label>
            <Input
              required
              id="launch-feature-name"
              placeholder="my-feature-slug"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="launch-project-path">Project path</Label>
            <Input
              required
              id="launch-project-path"
              placeholder="/absolute/path/to/project"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
            />
          </div>

          {applyWorkflow.isError ? (
            <Text className="text-destructive" size="sm">
              Failed to launch workflow. Please try again.
            </Text>
          ) : null}
        </form>
        <Separator />
        <DialogFooter>
          <Button
            disabled={applyWorkflow.isPending}
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            form="launch-workflow-form"
            type="submit"
          >
            {applyWorkflow.isPending ? <Spinner className="mr-2" size="sm" /> : null}
            Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
