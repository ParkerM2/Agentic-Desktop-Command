import { useStopWorkflow, useWorkflowRuns } from '../../api/useWorkflowEngine';
import { useAsyncRender } from '../../hooks/useAsyncRender';

export function useRunningWorkflowsPanel() {
  const query = useWorkflowRuns();
  const { data: runs, isLoading, isError, isEmpty } = useAsyncRender(query);
  const stopWorkflow = useStopWorkflow();

  function handleStop(runId: string) {
    stopWorkflow.mutate(runId);
  }

  return { runs, isLoading, isError, isEmpty, stopWorkflow, handleStop };
}
