import { useState } from 'react';

import { ListPlus, Zap } from 'lucide-react';

import {
  useCreateProgressTask,
  useCreatePlan,
  useRunWorkflow,
  useSpinUpTeam,
  useStartResearch,
} from '@renderer/features/tasks/api/useProgressMutations';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Flex,
} from '@ui';

import { useAttachRunToTask } from '../api/useAttachRunToTask';

import type { RunRecord } from '../lib/types';

interface ActiveScript {
  id: string;
  name: string;
}

interface ResultsWorkflowActionsProps {
  activeScript: ActiveScript | undefined;
  runRecord: RunRecord | null | undefined;
  projectId: string;
  activeRunId: string | null;
}

export function ResultsWorkflowActions({
  activeScript,
  runRecord,
  projectId,
  activeRunId,
}: ResultsWorkflowActionsProps) {
  const [createdTaskSlug, setCreatedTaskSlug] = useState<string | null>(null);
  const createTask = useCreateProgressTask();
  const attachRunToTask = useAttachRunToTask();
  const runWorkflow = useRunWorkflow();
  const startResearch = useStartResearch();
  const createPlan = useCreatePlan();
  const spinUpTeam = useSpinUpTeam();

  if (runRecord?.status !== 'failed') return null;

  const handleCreateTask = () => {
    if (!activeScript) return;
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

  return (
    <Flex align="center" className="ml-auto" gap="sm" wrap="nowrap">
      {createdTaskSlug ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Zap className="mr-1 h-3 w-3" /> Start Workflow
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => runWorkflow.mutate({ slug: createdTaskSlug })}
            >
              Full Pipeline (Research → Plan → Team)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => startResearch.mutate({ slug: createdTaskSlug })}
            >
              Research Only
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => createPlan.mutate({ slug: createdTaskSlug })}
            >
              Plan Only
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => spinUpTeam.mutate({ slug: createdTaskSlug })}
            >
              Team Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          disabled={createTask.isPending}
          size="sm"
          variant="outline"
          onClick={handleCreateTask}
        >
          <ListPlus className="mr-1 h-3 w-3" />
          {createTask.isPending ? 'Creating...' : 'Create Task'}
        </Button>
      )}
    </Flex>
  );
}
