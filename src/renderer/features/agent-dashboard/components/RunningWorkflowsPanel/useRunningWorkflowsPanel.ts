import { useStopWorkflow, useWorkflowRuns } from '../../api/useWorkflowEngine';

interface UseRunningWorkflowsPanelReturn {
  runs: ReturnType<typeof useWorkflowRuns>['data'];
  isLoading: boolean;
  isError: boolean;
  stopWorkflow: ReturnType<typeof useStopWorkflow>;
  handleStop: (runId: string) => void;
}

export function useRunningWorkflowsPanel(): UseRunningWorkflowsPanelReturn {
  const { data: runs, isLoading, isError } = useWorkflowRuns();
  const stopWorkflow = useStopWorkflow();

  function handleStop(runId: string) {
    stopWorkflow.mutate(runId);
  }

  return { runs, isLoading, isError, stopWorkflow, handleStop };
}
