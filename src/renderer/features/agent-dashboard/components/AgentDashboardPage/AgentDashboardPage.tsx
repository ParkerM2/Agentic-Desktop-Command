/**
 * AgentDashboardPage — Top-level page component
 *
 * Two tabs:
 *   - Agents: existing agent session monitoring UI
 *   - Workflows: template picker + editor + running workflows + launch flow
 */

import { Bot, Search, Square } from 'lucide-react';

import type {
  AgentSession,
  AgentSessionType,
  AgentStatus,
} from '@shared/types/agent-dashboard';

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
  PageContent,
  PageHeader,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Text,
} from '@ui';

import { AgentLayoutGrid } from '../AgentLayoutGrid';
import { AgentLayoutSingle } from '../AgentLayoutSingle';
import { AgentLayoutToolbar } from '../AgentLayoutToolbar';
import { AgentPanelPopup } from '../AgentPanelPopup';
import { RunningWorkflowsPanel } from '../RunningWorkflowsPanel';
import { TemplateEditorPanel } from '../TemplateEditorPanel';
import { TemplateListPanel } from '../TemplateListPanel';

import { useAgentDashboardPage } from './useAgentDashboardPage';

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
  const {
    agents,
    filteredAgents,
    runningAgents,
    hasRunningAgents,
    popupAgent,
    agentUiState,
    sessionFilters,
    setSessionFilters,
    isStopAllDialogOpen,
    setIsStopAllDialogOpen,
    pendingStopIds,
    activeMainTab,
    setActiveMainTab,
    teamNameOptions,
    handleLayoutChange,
    handleFilterChange,
    handlePanelStateChange,
    handleClosePopup,
    handleViewAgent,
    handleStopSession,
    handleStopAll,
    launchDialog,
  } = useAgentDashboardPage({ agentsProp });

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
      <PageHeader.Tabs
        value={activeMainTab}
        onValueChange={(v) => setActiveMainTab(v as 'agents' | 'workflows')}
      >
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
          <PageHeader.TabList>
            <PageHeader.Tab value="agents">
              <Bot className="h-4 w-4" /> Agents
            </PageHeader.Tab>
            <PageHeader.Tab value="workflows">Workflows</PageHeader.Tab>
          </PageHeader.TabList>
        </PageHeader>

        <PageHeader.TabContent className="flex min-h-0 flex-1 flex-col" value="agents">
          {renderAgentsContent()}
        </PageHeader.TabContent>

        <PageHeader.TabContent className="min-h-0 flex-1 overflow-auto" value="workflows">
          <PageContent>
            <WorkflowsTabContent />
          </PageContent>
        </PageHeader.TabContent>
      </PageHeader.Tabs>

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
      <LaunchWorkflowDialog {...launchDialog} />
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

interface LaunchWorkflowDialogProps {
  isOpen: boolean;
  templateName: string | undefined;
  featureName: string;
  projectPath: string;
  canSubmit: boolean;
  isPending: boolean;
  isError: boolean;
  setFeatureName: (value: string) => void;
  setProjectPath: (value: string) => void;
  handleClose: () => void;
  handleSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
}

function LaunchWorkflowDialog({
  isOpen,
  templateName,
  featureName,
  projectPath,
  canSubmit,
  isPending,
  isError,
  setFeatureName,
  setProjectPath,
  handleClose,
  handleSubmit,
}: LaunchWorkflowDialogProps) {
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
          {templateName === undefined ? null : (
            <Text size="sm" variant="muted">
              Template: <span className="font-medium text-foreground">{templateName}</span>
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

          {isError ? (
            <Text className="text-destructive" size="sm">
              Failed to launch workflow. Please try again.
            </Text>
          ) : null}
        </form>
        <Separator />
        <DialogFooter>
          <Button
            disabled={isPending}
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
            {isPending ? <Spinner className="mr-2" size="sm" /> : null}
            Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
