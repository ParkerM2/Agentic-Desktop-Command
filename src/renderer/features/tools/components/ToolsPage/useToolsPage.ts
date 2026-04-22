import { useLayoutStore } from '@renderer/shared/stores';

import { useProjects } from '@features/projects';

import { useClaudeConfig } from '../../api/useClaudeConfig';
import { useToolsUI } from '../../store';

export function useToolsPage() {
  const { activeTab, setActiveTab } = useToolsUI();
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();
  const activeProject = projects?.find((p) => p.id === activeProjectId);
  const { data, isLoading, refetch } = useClaudeConfig(activeProject?.path);

  return {
    activeTab,
    setActiveTab,
    data,
    isLoading,
    refetch,
  };
}
