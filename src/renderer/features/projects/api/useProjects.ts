/**
 * React Query hooks for project operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PROJECTS } from '@shared/ipc/projects/channels';
import type { InvokeInput } from '@shared/ipc-contract';
import type { CreateProjectInput } from '@shared/types/project-setup';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { projectKeys } from './queryKeys';

/** Fetch all projects */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => ipc(PROJECTS.LIST.ALL, {}),
    staleTime: 60_000,
  });
}

/** Add a new project */
export function useAddProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: InvokeInput<typeof PROJECTS.ADD.PROJECT>) => ipc(PROJECTS.ADD.PROJECT, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    onError: onError('add project'),
  });
}

/** Remove a project */
export function useRemoveProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (projectId: string) => ipc(PROJECTS.REMOVE.PROJECT, { projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    onError: onError('remove project'),
  });
}

/** Open directory picker dialog */
export function useSelectDirectory() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: () => ipc(PROJECTS.SELECT.DIRECTORY, {}),
    onError: onError('select directory'),
  });
}

/** Update an existing project */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: InvokeInput<typeof PROJECTS.UPDATE.PROJECT>) =>
      ipc(PROJECTS.UPDATE.PROJECT, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError: onError('update project'),
  });
}

/** Fetch sub-projects for a project */
export function useSubProjects(projectId: string) {
  return useQuery({
    queryKey: projectKeys.subProjects(projectId),
    queryFn: () => ipc(PROJECTS.GET['SUB-PROJECTS'], { projectId }),
    enabled: projectId.length > 0,
  });
}

/** Create a sub-project */
export function useCreateSubProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: InvokeInput<typeof PROJECTS.CREATE['SUB-PROJECT']>) =>
      ipc(PROJECTS.CREATE['SUB-PROJECT'], data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.subProjects(variables.projectId),
      });
    },
    onError: onError('create sub-project'),
  });
}

/** Start setup pipeline for an existing project */
export function useSetupExisting() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: { projectId: string }) =>
      ipc(PROJECTS.SETUP.EXISTING, input),
    onError: onError('setup project'),
  });
}

/** Create a brand-new project (init from scratch) */
export function useCreateNewProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      ipc(PROJECTS.CREATE.NEW, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    onError: onError('create new project'),
  });
}

/** Delete a sub-project */
export function useDeleteSubProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: InvokeInput<typeof PROJECTS.DELETE['SUB-PROJECT']>) =>
      ipc(PROJECTS.DELETE['SUB-PROJECT'], data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.subProjects(variables.projectId),
      });
    },
    onError: onError('delete sub-project'),
  });
}
