/**
 * Workflow Templates — TanStack Query hooks for the Tools feature
 *
 * CRUD + Duplicate + Artifact scanning hooks via IPC.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { WorkflowTemplate } from '@shared/ipc/workflow-templates/schemas';

import { ipc } from '@renderer/shared/lib/ipc';

// ─── Query Keys ──────────────────────────────────────────────

export const workflowTemplateKeys = {
  all: ['workflowTemplates'] as const,
  list: () => [...workflowTemplateKeys.all, 'list'] as const,
  detail: (id: string) => [...workflowTemplateKeys.all, 'detail', id] as const,
  artifacts: (projectPath: string) =>
    [...workflowTemplateKeys.all, 'artifacts', projectPath] as const,
};

// ─── Queries ─────────────────────────────────────────────────

/** Fetch all workflow templates */
export function useWorkflowTemplates() {
  return useQuery({
    queryKey: workflowTemplateKeys.list(),
    queryFn: async () => {
      const result = await ipc('workflowTemplates.list', {});
      return result.templates;
    },
    staleTime: 10_000,
  });
}

/** Fetch a single template by ID */
export function useWorkflowTemplate(id: string | null) {
  return useQuery({
    queryKey: workflowTemplateKeys.detail(id ?? ''),
    queryFn: async () => {
      const result = await ipc('workflowTemplates.get', { id: id ?? '' });
      return result.template;
    },
    enabled: id !== null,
    staleTime: 10_000,
  });
}

/** Scan plugin artifacts for a project */
export function usePluginArtifacts(projectPath: string | null) {
  return useQuery({
    queryKey: workflowTemplateKeys.artifacts(projectPath ?? ''),
    queryFn: async () => {
      const result = await ipc('workflowTemplates.scanArtifacts', {
        projectPath: projectPath ?? '',
      });
      return result.artifacts;
    },
    enabled: projectPath !== null,
    staleTime: 30_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────

type CreateTemplateInput = Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltin'>;
type UpdateTemplateInput = Partial<CreateTemplateInput>;

/** Create a new workflow template */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) => ipc('workflowTemplates.create', input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.list() });
    },
  });
}

/** Update an existing workflow template */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTemplateInput }) =>
      ipc('workflowTemplates.update', { id, updates }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.all });
    },
  });
}

/** Delete a workflow template */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc('workflowTemplates.delete', { id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.list() });
    },
  });
}

/** Duplicate a workflow template */
export function useDuplicateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      ipc('workflowTemplates.duplicate', { id, name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workflowTemplateKeys.list() });
    },
  });
}
