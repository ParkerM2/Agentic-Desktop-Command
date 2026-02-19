/**
 * React Query hooks for project operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { InvokeInput } from '@shared/ipc-contract';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { projectKeys } from './queryKeys';

/** Fetch all projects */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => ipc('projects.list', {}),
    staleTime: 60_000,
  });
}

/** Add a new project */
export function useAddProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: InvokeInput<'projects.add'>) => ipc('projects.add', data),
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
    mutationFn: (projectId: string) => ipc('projects.remove', { projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    onError: onError('remove project'),
  });
}

/** Initialize a project (set up .adc folder, etc.) */
export function useInitializeProject() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (projectId: string) => ipc('projects.initialize', { projectId }),
    onError: onError('initialize project'),
  });
}

/** Open directory picker dialog */
export function useSelectDirectory() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: () => ipc('projects.selectDirectory', {}),
    onError: onError('select directory'),
  });
}

/** Update an existing project */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: InvokeInput<'projects.update'>) =>
      ipc('projects.update', data),
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
    queryFn: () => ipc('projects.getSubProjects', { projectId }),
    enabled: projectId.length > 0,
  });
}

/** Create a sub-project */
export function useCreateSubProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: InvokeInput<'projects.createSubProject'>) =>
      ipc('projects.createSubProject', data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.subProjects(variables.projectId),
      });
    },
    onError: onError('create sub-project'),
  });
}

/** Delete a sub-project */
export function useDeleteSubProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: InvokeInput<'projects.deleteSubProject'>) =>
      ipc('projects.deleteSubProject', data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.subProjects(variables.projectId),
      });
    },
    onError: onError('delete sub-project'),
  });
}
