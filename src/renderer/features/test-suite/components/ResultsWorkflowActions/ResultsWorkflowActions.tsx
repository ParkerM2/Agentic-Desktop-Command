import { ListPlus, Zap } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Flex,
} from '@ui';

import { useResultsWorkflowActions } from './useResultsWorkflowActions';

import type { RunRecord } from '../../lib/types';

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
  const vm = useResultsWorkflowActions({ activeScript, runRecord, projectId, activeRunId });

  if (!vm.isFailed) return null;

  return (
    <Flex align="center" className="ml-auto" gap="sm" wrap="nowrap">
      {vm.createdTaskSlug ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Zap className="mr-1 h-3 w-3" /> Start Workflow
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={vm.handleRunWorkflow}>
              Full Pipeline (Research → Plan → Team)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={vm.handleStartResearch}>
              Research Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={vm.handleCreatePlan}>
              Plan Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={vm.handleSpinUpTeam}>
              Team Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          disabled={vm.creating}
          size="sm"
          variant="outline"
          onClick={vm.handleCreateTask}
        >
          <ListPlus className="mr-1 h-3 w-3" />
          {vm.creating ? 'Creating...' : 'Create Task'}
        </Button>
      )}
    </Flex>
  );
}
