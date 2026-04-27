import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { useProjects, useAddProject, useRemoveProject, useSelectDirectory } from '../../api/useProjects';

export function useProjectList() {
  const { data: projects, isLoading } = useProjects();
  const addProject = useAddProject();
  const removeProject = useRemoveProject();
  const selectDir = useSelectDirectory();
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const setActiveProject = useLayoutStore((s) => s.setActiveProject);

  async function handleAdd() {
    const result = await selectDir.mutateAsync();
    if (result.path) {
      const project = await addProject.mutateAsync({ path: result.path });
      setActiveProject(project.id);
    }
  }

  function handleRemove(projectId: string) {
    removeProject.mutate(projectId);
  }

  return {
    projects,
    isLoading,
    activeProjectId,
    setActiveProject,
    handleAdd,
    handleRemove,
  };
}
