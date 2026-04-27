import { useCallback, useMemo, useState } from 'react';

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

import { useStopSession } from '../../api/useAgentMutations';
import { useAgentSessions } from '../../api/useAgentSessions';
import { useApplyWorkflow } from '../../api/useWorkflowEngine';
import { useWorkflowTemplate } from '../../api/useWorkflowTemplates';
import { useAgentDashboardStore } from '../../store';

// ─── Types ──────────────────────────────────────────────────

interface SessionFilterState {
  sessionType: AgentSessionType | 'all';
  status: AgentStatus | 'all';
  teamName: string;
  search: string;
}

interface UseAgentDashboardPageParams {
  agentsProp?: AgentSession[];
}

interface LaunchDialogState {
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

interface UseAgentDashboardPageReturn {
  agents: AgentSession[];
  filteredAgents: AgentSession[];
  runningAgents: AgentSession[];
  hasRunningAgents: boolean;
  popupAgent: AgentSession | undefined;
  agentUiState: AgentDashboardState;
  sessionFilters: SessionFilterState;
  setSessionFilters: React.Dispatch<React.SetStateAction<SessionFilterState>>;
  isStopAllDialogOpen: boolean;
  setIsStopAllDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pendingStopIds: Set<string>;
  activeMainTab: 'agents' | 'workflows';
  setActiveMainTab: (tab: 'agents' | 'workflows') => void;
  teamNameOptions: string[];
  handleLayoutChange: (mode: AgentLayoutMode) => void;
  handleFilterChange: (filters: AgentDashboardFilters) => void;
  handlePanelStateChange: (agentId: string, panelState: AgentPanelState) => void;
  handleClosePopup: () => void;
  handleViewAgent: (agentId: string) => void;
  handleStopSession: (agentId: string) => void;
  handleStopAll: () => void;
  launchDialog: LaunchDialogState;
}

export function useAgentDashboardPage({ agentsProp }: UseAgentDashboardPageParams): UseAgentDashboardPageReturn {
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

  const teamNameOptions = useMemo(() => {
    const names = Array.from(
      new Set(agents.map((a) => a.teamName).filter((n): n is string => n !== undefined && n !== ''))
    );
    return names;
  }, [agents]);

  const filteredAgents = useMemo(() => {
    let result = agents;

    if (agentUiState.filters.projectId !== undefined) {
      result = result.filter((a) => a.projectId === agentUiState.filters.projectId);
    }
    if (agentUiState.filters.status !== undefined) {
      result = result.filter((a) => a.status === agentUiState.filters.status);
    }

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

  function handleStopAll() {
    runningAgents.forEach((a) => {
      handleStopSession(a.id);
    });
    setIsStopAllDialogOpen(false);
  }

  // ─── Launch workflow dialog ────────────────────────────

  const isLaunchDialogOpen = useAgentDashboardStore((s) => s.isLaunchDialogOpen);
  const launchTemplateId = useAgentDashboardStore((s) => s.launchTemplateId);
  const closeLaunchDialog = useAgentDashboardStore((s) => s.closeLaunchDialog);

  const { data: launchTemplate } = useWorkflowTemplate(launchTemplateId);
  const applyWorkflow = useApplyWorkflow();

  const [launchFeatureName, setLaunchFeatureName] = useState('');
  const [launchProjectPath, setLaunchProjectPath] = useState('');

  const handleLaunchClose = useCallback(() => {
    closeLaunchDialog();
    setLaunchFeatureName('');
    setLaunchProjectPath('');
  }, [closeLaunchDialog]);

  const handleLaunchSubmit = useCallback(
    (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (launchTemplateId === null) return;

      applyWorkflow.mutate(
        {
          templateId: launchTemplateId,
          featureName: launchFeatureName,
          projectPath: launchProjectPath,
          overrides: {},
        },
        { onSuccess: () => handleLaunchClose() },
      );
    },
    [launchTemplateId, launchFeatureName, launchProjectPath, applyWorkflow, handleLaunchClose],
  );

  const launchCanSubmit =
    launchFeatureName.trim().length > 0 &&
    launchProjectPath.trim().length > 0 &&
    !applyWorkflow.isPending;

  const launchDialog: LaunchDialogState = {
    isOpen: isLaunchDialogOpen,
    templateName: launchTemplate?.name,
    featureName: launchFeatureName,
    projectPath: launchProjectPath,
    canSubmit: launchCanSubmit,
    isPending: applyWorkflow.isPending,
    isError: applyWorkflow.isError,
    setFeatureName: setLaunchFeatureName,
    setProjectPath: setLaunchProjectPath,
    handleClose: handleLaunchClose,
    handleSubmit: handleLaunchSubmit,
  };

  return {
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
  };
}
