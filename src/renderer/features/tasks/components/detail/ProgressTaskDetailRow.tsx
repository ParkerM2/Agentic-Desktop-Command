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

import { TeamActivityPanel } from './TeamActivityPanel';

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
        <Text className="whitespace-pre-wrap font-mono text-muted-foreground" size="sm">
          {truncate(content, previewLength)}
        </Text>
      )}
      <CollapsibleContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </CollapsibleContent>
      <CollapsibleTrigger asChild>
        <Button className="mt-2 h-7 px-2 text-xs text-muted-foreground" size="sm" variant="ghost">
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
      <Spinner className="text-muted-foreground" size="sm" />
      <Text size="sm" variant="muted">Researching...</Text>
    </Flex>
  ) : (
    <Button disabled={isActionActive} size="sm" variant="outline" onClick={onStart}>
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
      <Spinner className="text-muted-foreground" size="sm" />
      <Text size="sm" variant="muted">Creating plan...</Text>
    </Flex>
  ) : (
    <Button
      disabled={isActionActive || !task.hasResearch}
      size="sm"
      variant="outline"
      onClick={onCreatePlan}
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
            className="self-start"
            disabled={isActionActive}
            size="sm"
            variant="primary"
            onClick={onSpinUpTeam}
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
  const showActivityPanel = task.status === 'executing' || task.status === 'review';
  const completionLabel = task.status === 'done' ? 'Pipeline Complete' : 'Ready for Review';
  const teamStatusLabel = task.status === 'done' ? 'Completed' : 'In Review';

  const teamBody = isExecuting ? (
    <Flex align="center" gap="sm">
      <Spinner className="text-muted-foreground" size="sm" />
      <Text size="sm" variant="muted">Spinning up team...</Text>
    </Flex>
  ) : (
    <Button
      disabled={isActionActive || !task.hasPlan}
      size="sm"
      variant="outline"
      onClick={onSpinUpTeam}
    >
      Spin Up Team
    </Button>
  );

  return (
    <Stack gap="sm">
      <Heading as="h4">Team Execution</Heading>
      {task.hasTeamTasks ? (
        <Flex align="center" gap="sm">
          <Badge size="sm" variant="secondary">
            {task.teamTaskCount} agent {task.teamTaskCount === 1 ? 'task' : 'tasks'}
          </Badge>
          {isComplete ? (
            <Badge size="sm" variant="success">{teamStatusLabel}</Badge>
          ) : null}
          <Button asChild size="sm" variant="ghost">
            <a href="/visualization">View in Visualization</a>
          </Button>
        </Flex>
      ) : (
        teamBody
      )}
      {showActivityPanel ? (
        <TeamActivityPanel taskSlug={task.slug} />
      ) : null}
      {isComplete ? (
        <Badge className="self-start" size="md" variant="success">
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

  const activeSession = task.slug in activeSessions ? activeSessions[task.slug] : null;
  const activeAction = activeSession ? activeSession.action : undefined;
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
    <Stack className="px-4 py-4" gap="md">

      {/* ── Error Banner ─────────────────────────────── */}
      {task.status === 'error' ? (
        <InlineAlert title="Pipeline failed" variant="error">
          <Flex align="center" className="mt-2" gap="sm">
            <Text size="sm">An error occurred during pipeline execution.</Text>
            <Button
              disabled={isActionActive}
              size="sm"
              variant="destructive"
              onClick={handleRetry}
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
          <Button asChild size="sm" variant="outline">
            <a href={task.jiraUrl} rel="noreferrer" target="_blank">
              <Badge size="sm" variant="info">{task.jiraTicket}</Badge>
            </a>
          </Button>
        ) : (
          <Button disabled size="sm" variant="outline">
            Link Ticket
          </Button>
        )}

        {/* PR */}
        {hasPr ? (
          <Button asChild size="sm" variant="outline">
            <a href={task.prUrl} rel="noreferrer" target="_blank">
              <Flex align="center" gap="sm">
                <Text size="sm">#{task.prNumber}</Text>
                {task.prStatus === undefined ? null : (
                  <Badge size="sm" variant={prStatusVariant(task.prStatus)}>
                    {task.prStatus}
                  </Badge>
                )}
              </Flex>
            </a>
          </Button>
        ) : (
          <Button disabled size="sm" variant="outline">
            Link PR
          </Button>
        )}

        <Flex className="ml-auto" gap="sm" wrap="nowrap">
          <Button
            disabled={isActionActive}
            size="sm"
            variant="primary"
            onClick={() => { void runWorkflow(task.slug); }}
          >
            Run Workflow
          </Button>
          <Button
            disabled={isActionActive}
            size="sm"
            variant="destructive"
            onClick={() => { void archiveTask(task.slug); }}
          >
            Archive
          </Button>
        </Flex>
      </Flex>

      <Separator />

      {/* ── Research Section ─────────────────────────── */}
      <ResearchSection
        activeAction={activeAction}
        expanded={researchExpanded}
        isActionActive={isActionActive}
        task={task}
        onStart={() => { void startResearch(task.slug); }}
        onToggle={() => { setResearchExpanded((prev) => !prev); }}
      />

      <Separator />

      {/* ── Plan Section ─────────────────────────────── */}
      <PlanSection
        activeAction={activeAction}
        expanded={planExpanded}
        isActionActive={isActionActive}
        task={task}
        onCreatePlan={() => { void createPlan(task.slug); }}
        onSpinUpTeam={() => { void spinUpTeam(task.slug); }}
        onToggle={() => { setPlanExpanded((prev) => !prev); }}
      />

      <Separator />

      {/* ── Team Section ─────────────────────────────── */}
      <TeamSection
        activeAction={activeAction}
        isActionActive={isActionActive}
        task={task}
        onSpinUpTeam={() => { void spinUpTeam(task.slug); }}
      />

    </Stack>
  );
}
