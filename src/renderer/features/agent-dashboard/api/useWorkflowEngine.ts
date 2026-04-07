/**
 * Workflow Engine — TanStack Query hooks
 *
 * Hooks for listing, starting, stopping, and applying workflow engine runs.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { InvokeInput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

// ─── Query Keys ──────────────────────────────────────────────

export const workflowEngineKeys = {
  all: ['workflow-engine'] as const,
  runs: () => [...workflowEngineKeys.all, 'runs'] as const,
  run: (id: string) => [...workflowEngineKeys.all, 'run', id] as const,
  agentDefs: () => [...workflowEngineKeys.all, 'agent-defs'] as const,
};

// ─── Queries ─────────────────────────────────────────────────

/** Poll all running workflow engine records */
export function useWorkflowRuns() {
  return useQuery({
    queryKey: workflowEngineKeys.runs(),
    queryFn: () => ipc('workflow-engine.list', {}),
    staleTime: 2_000,
  });
}

/** Fetch all available agent definitions from .claude/agents/*.md */
export function useAgentDefinitions() {
  return useQuery({
    queryKey: workflowEngineKeys.agentDefs(),
    queryFn: () => ipc('workflow-engine.listAgentDefs', {}),
    staleTime: 60_000,
  });
}

/** Fetch a single workflow run record */
export function useWorkflowRun(runId: string | null) {
  return useQuery({
    queryKey: workflowEngineKeys.run(runId ?? ''),
    queryFn: () => ipc('workflow-engine.get', { runId: runId ?? '' }),
    enabled: runId !== null,
    staleTime: 1_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────

type ApplyWorkflowInput = InvokeInput<'workflow-engine.apply'>;

/** Apply a template to start a workflow run */
export function useApplyWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyWorkflowInput) => ipc('workflow-engine.apply', input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workflowEngineKeys.runs() });
    },
  });
}

/** Stop a running workflow */
export function useStopWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => ipc('workflow-engine.stop', { runId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workflowEngineKeys.runs() });
    },
  });
}
