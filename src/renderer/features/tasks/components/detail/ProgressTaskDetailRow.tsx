/**
 * ProgressTaskDetailRow
 *
 * Expanded row component for a ProgressTask. Renders the full
 * Research → Plan → Team execution pipeline with action buttons.
 *
 * Reads live data from useProgressContext (global store).
 * Local useState is used only for expand/collapse of content sections.
 */

import { useState } from 'react';

import ReactMarkdown from 'react-markdown';

import type { ProgressTask } from '@shared/types/progress';

import { useProgressContext } from '@renderer/shared/stores/progress-context-store';

import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Flex,
  Heading,
  InlineAlert,
  Separator,
  Spinner,
  Stack,
  Text,
} from '@ui';

// ─── Types ───────────────────────────────────────────────

interface ProgressTaskDetailRowProps {
  task: ProgressTask;
}

// ─── Helpers ─────────────────────────────────────────────

/** Returns the first N characters of content with an ellipsis if truncated. */
function truncate(content: string, maxLen: number): string {
  if (content.length <= maxLen) return content;
  return `${content.slice(0, maxLen)}…`;
}

type PrBadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'success';

function prStatusVariant(status: string | undefined): PrBadgeVariant {
  switch (status) {
    case 'closed': {
      return 'destructive';
    }
    case 'draft': {
      return 'secondary';
    }
    case 'merged': {
      return 'default';
    }
    case 'open': {
      return 'success';
    }
    case undefined: {
      return 'outline';
    }
    default: {
      return 'outline';
    }
  }
}

// ─── ContentBlock Sub-component ──────────────────────────

interface ContentBlockProps {
  content: string;
  expanded: boolean;
  onToggle: () => void;
  previewLength?: number;
}

function ContentBlock({ content, expanded, onToggle, previewLength = 200 }: ContentBlockProps) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      {expanded ? null : (
        <Text size="sm" className="whitespace-pre-wrap font-mono text-muted-foreground">
          {truncate(content, previewLength)}
        </Text>
      )}
      <CollapsibleContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </CollapsibleContent>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs text-muted-foreground">
          {expanded ? 'Show less' : 'Show full'}
        </Button>
      </CollapsibleTrigger>
    </Collapsible>
  );
}

// ─── ResearchSection Sub-component ───────────────────────

interface ResearchSectionProps {
  task: ProgressTask;
  activeAction: string | undefined;
  isActionActive: boolean;
  expanded: boolean;
  onToggle: () => void;
  onStart: () => void;
}

function ResearchSection({
  task,
  activeAction,
  isActionActive,
  expanded,
  onToggle,
  onStart,
}: ResearchSectionProps) {
  const isResearching = activeAction === 'research';

  const researchBody = isResearching ? (
    <Flex align="center" gap="sm">
      <Spinner size="sm" className="text-muted-foreground" />
      <Text size="sm" variant="muted">Researching...</Text>
    </Flex>
  ) : (
    <Button variant="outline" size="sm" onClick={onStart} disabled={isActionActive}>
      Deep Research
    </Button>
  );

  return (
    <Stack gap="sm">
      <Heading as="h4">Research</Heading>
      {task.hasResearch ? (
        <ContentBlock
          content={task.researchContent ?? ''}
          expanded={expanded}
          onToggle={onToggle}
        />
      ) : (
        researchBody
      )}
    </Stack>
  );
}

// ─── PlanSection Sub-component ───────────────────────────

interface PlanSectionProps {
  task: ProgressTask;
  activeAction: string | undefined;
  isActionActive: boolean;
  expanded: boolean;
  onToggle: () => void;
  onCreatePlan: () => void;
  onSpinUpTeam: () => void;
}

function PlanSection({
  task,
  activeAction,
  isActionActive,
  expanded,
  onToggle,
  onCreatePlan,
  onSpinUpTeam,
}: PlanSectionProps) {
  const isPlanning = activeAction === 'plan';

  const planBody = isPlanning ? (
    <Flex align="center" gap="sm">
      <Spinner size="sm" className="text-muted-foreground" />
      <Text size="sm" variant="muted">Creating plan...</Text>
    </Flex>
  ) : (
    <Button
      variant="outline"
      size="sm"
      onClick={onCreatePlan}
      disabled={isActionActive || !task.hasResearch}
    >
      Create Plan
    </Button>
  );

  return (
    <Stack gap="sm">
      <Heading as="h4">Implementation Plan</Heading>
      {task.hasPlan ? (
        <Stack gap="sm">
          <ContentBlock
            content={task.planContent ?? ''}
            expanded={expanded}
            onToggle={onToggle}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={onSpinUpTeam}
            disabled={isActionActive}
            className="self-start"
          >
            Spin Up Team
          </Button>
        </Stack>
      ) : (
        planBody
      )}
    </Stack>
  );
}

// ─── TeamSection Sub-component ───────────────────────────

interface TeamSectionProps {
  task: ProgressTask;
  activeAction: string | undefined;
  isActionActive: boolean;
  onSpinUpTeam: () => void;
}

function TeamSection({ task, activeAction, isActionActive, onSpinUpTeam }: TeamSectionProps) {
  const isExecuting = activeAction === 'team';
  const isComplete = task.status === 'done' || task.status === 'review';
  const completionLabel = task.status === 'done' ? 'Pipeline Complete' : 'Ready for Review';
  const teamStatusLabel = task.status === 'done' ? 'Completed' : 'In Review';

  const teamBody = isExecuting ? (
    <Flex align="center" gap="sm">
      <Spinner size="sm" className="text-muted-foreground" />
      <Text size="sm" variant="muted">Spinning up team...</Text>
    </Flex>
  ) : (
    <Button
      variant="outline"
      size="sm"
      onClick={onSpinUpTeam}
      disabled={isActionActive || !task.hasPlan}
    >
      Spin Up Team
    </Button>
  );

  return (
    <Stack gap="sm">
      <Heading as="h4">Team Execution</Heading>
      {task.hasTeamTasks ? (
        <Flex align="center" gap="sm">
          <Badge variant="secondary" size="sm">
            {task.teamTaskCount} agent {task.teamTaskCount === 1 ? 'task' : 'tasks'}
          </Badge>
          {isComplete ? (
            <Badge variant="success" size="sm">{teamStatusLabel}</Badge>
          ) : null}
          <Button variant="ghost" size="sm" asChild>
            <a href="/visualization">View in Visualization</a>
          </Button>
        </Flex>
      ) : (
        teamBody
      )}
      {isComplete ? (
        <Badge variant="success" size="md" className="self-start">
          {completionLabel}
        </Badge>
      ) : null}
    </Stack>
  );
}

// ─── ProgressTaskDetailRow ───────────────────────────────

export function ProgressTaskDetailRow({ task }: ProgressTaskDetailRowProps) {
  const {
    activeSessions,
    archiveTask,
    createPlan,
    runWorkflow,
    spinUpTeam,
    startResearch,
  } = useProgressContext();

  const [researchExpanded, setResearchExpanded] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);

  const activeSession = activeSessions.get(task.slug);
  const activeAction = activeSession?.action;
  const isActionActive = activeAction !== undefined;

  // Jira / PR visibility
  const hasJira = task.jiraTicket !== undefined && task.jiraUrl !== undefined;
  const hasPr = task.prNumber !== undefined && task.prUrl !== undefined;

  // Retry logic: trigger whichever step is missing
  function handleRetry() {
    if (task.hasResearch && task.hasPlan) {
      void spinUpTeam(task.slug);
    } else if (task.hasResearch) {
      void createPlan(task.slug);
    } else {
      void startResearch(task.slug);
    }
  }

  return (
    <Stack gap="md" className="px-4 py-4">

      {/* ── Error Banner ─────────────────────────────── */}
      {task.status === 'error' ? (
        <InlineAlert variant="error" title="Pipeline failed">
          <Flex align="center" gap="sm" className="mt-2">
            <Text size="sm">An error occurred during pipeline execution.</Text>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRetry}
              disabled={isActionActive}
            >
              Retry
            </Button>
          </Flex>
        </InlineAlert>
      ) : null}

      {/* ── Top Bar ──────────────────────────────────── */}
      <Flex align="center" gap="sm" wrap="wrap">

        {/* Jira */}
        {hasJira ? (
          <Button variant="outline" size="sm" asChild>
            <a href={task.jiraUrl} target="_blank" rel="noreferrer">
              <Badge variant="info" size="sm">{task.jiraTicket}</Badge>
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Link Ticket
          </Button>
        )}

        {/* PR */}
        {hasPr ? (
          <Button variant="outline" size="sm" asChild>
            <a href={task.prUrl} target="_blank" rel="noreferrer">
              <Flex align="center" gap="sm">
                <Text size="sm">#{task.prNumber}</Text>
                {task.prStatus === undefined ? null : (
                  <Badge variant={prStatusVariant(task.prStatus)} size="sm">
                    {task.prStatus}
                  </Badge>
                )}
              </Flex>
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Link PR
          </Button>
        )}

        <Flex gap="sm" wrap="nowrap" className="ml-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => { void runWorkflow(task.slug); }}
            disabled={isActionActive}
          >
            Run Workflow
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { void archiveTask(task.slug); }}
            disabled={isActionActive}
          >
            Archive
          </Button>
        </Flex>
      </Flex>

      <Separator />

      {/* ── Research Section ─────────────────────────── */}
      <ResearchSection
        task={task}
        activeAction={activeAction}
        isActionActive={isActionActive}
        expanded={researchExpanded}
        onToggle={() => { setResearchExpanded((prev) => !prev); }}
        onStart={() => { void startResearch(task.slug); }}
      />

      <Separator />

      {/* ── Plan Section ─────────────────────────────── */}
      <PlanSection
        task={task}
        activeAction={activeAction}
        isActionActive={isActionActive}
        expanded={planExpanded}
        onToggle={() => { setPlanExpanded((prev) => !prev); }}
        onCreatePlan={() => { void createPlan(task.slug); }}
        onSpinUpTeam={() => { void spinUpTeam(task.slug); }}
      />

      <Separator />

      {/* ── Team Section ─────────────────────────────── */}
      <TeamSection
        task={task}
        activeAction={activeAction}
        isActionActive={isActionActive}
        onSpinUpTeam={() => { void spinUpTeam(task.slug); }}
      />

    </Stack>
  );
}
