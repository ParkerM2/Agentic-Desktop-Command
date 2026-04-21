import { useState } from 'react';

import {
  useCreateProgressTask,
  useCreatePlan,
  useRunWorkflow,
  useSpinUpTeam,
  useStartResearch,
} from '@renderer/features/tasks/api/useProgressMutations';

import { useAttachRunToTask } from '../../api/useAttachRunToTask';

import type { RunRecord } from '../../lib/types';

interface ActiveScript {
  id: string;
  name: string;
}

interface UseResultsWorkflowActionsProps {
  activeScript: ActiveScript | undefined;
  runRecord: RunRecord | null | undefined;
  projectId: string;
  activeRunId: string | null;
}

export function useResultsWorkflowActions({
  activeScript,
  runRecord,
  projectId,
  activeRunId,
}: UseResultsWorkflowActionsProps) {
  const [createdTaskSlug, setCreatedTaskSlug] = useState<string | null>(null);
  const createTask = useCreateProgressTask();
  const attachRunToTask = useAttachRunToTask();
  const runWorkflow = useRunWorkflow();
  const startResearch = useStartResearch();
  const createPlan = useCreatePlan();
  const spinUpTeam = useSpinUpTeam();

  const isFailed = runRecord?.status === 'failed';

  const handleCreateTask = () => {
    if (!activeScript || !runRecord) return;
    const title = `Fix: ${activeScript.name} test failure`;
    const errorLines = (runRecord.outputLines ?? [])
      .filter((l) => l.includes('Error') || l.includes('\u2717'))
      .join('\n');
    const errorSummary =
      runRecord.error
      ?? (errorLines.length > 0 ? errorLines : 'Test failed — see run output for details');
    const description = `## Test Failure\n\n**Script:** ${activeScript.name}\n**Status:** ${runRecord.status}\n**Steps passed:** ${runRecord.stepsPassed ?? 0}\n**Steps failed:** ${runRecord.stepsFailed ?? 0}\n\n### Error Output\n\n\`\`\`\n${errorSummary}\n\`\`\``;

    createTask.mutate(
      { title, description, priority: 'high', projectId },
      {
        onSuccess: (task) => {
          setCreatedTaskSlug(task.slug);
          if (activeRunId) {
            attachRunToTask.mutate({ runId: activeRunId, taskId: task.slug });
          }
        },
      },
    );
  };

  const handleRunWorkflow = () => {
    if (createdTaskSlug) runWorkflow.mutate({ slug: createdTaskSlug });
  };

  const handleStartResearch = () => {
    if (createdTaskSlug) startResearch.mutate({ slug: createdTaskSlug });
  };

  const handleCreatePlan = () => {
    if (createdTaskSlug) createPlan.mutate({ slug: createdTaskSlug });
  };

  const handleSpinUpTeam = () => {
    if (createdTaskSlug) spinUpTeam.mutate({ slug: createdTaskSlug });
  };

  return {
    isFailed,
    createdTaskSlug,
    creating: createTask.isPending,
    handleCreateTask,
    handleRunWorkflow,
    handleStartResearch,
    handleCreatePlan,
    handleSpinUpTeam,
  };
}
