import { useState } from 'react';

import { useRepoStructure } from '../../api/useGit';
import { useSubProjects, useCreateSubProject, useDeleteSubProject } from '../../api/useProjects';

interface UseSubprojectSelectorProps {
  projectId: string;
  repoPath: string;
}

export function useSubprojectSelector({ projectId, repoPath }: UseSubprojectSelectorProps) {
  const { data: structureData, isLoading: structureLoading } = useRepoStructure(repoPath);
  const { data: subProjects, isLoading: subProjectsLoading } = useSubProjects(projectId);
  const createSubProject = useCreateSubProject();
  const deleteSubProject = useDeleteSubProject();

  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');

  const isLoading = structureLoading || subProjectsLoading;

  function handleAdd() {
    if (newName.trim().length === 0 || newPath.trim().length === 0) return;
    createSubProject.mutate(
      { projectId, name: newName.trim(), relativePath: newPath.trim() },
      {
        onSuccess: () => {
          setNewName('');
          setNewPath('');
        },
      },
    );
  }

  function handleRemove(subProjectId: string) {
    deleteSubProject.mutate({ projectId, subProjectId });
  }

  return {
    structureData,
    subProjects,
    isLoading,
    newName,
    newPath,
    createSubProject,
    deleteSubProject,
    setNewName,
    setNewPath,
    handleAdd,
    handleRemove,
  };
}
