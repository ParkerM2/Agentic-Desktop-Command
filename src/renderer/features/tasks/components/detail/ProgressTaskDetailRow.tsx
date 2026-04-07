/**
 * ProgressTaskDetailRow
 *
 * Expanded row component for a ProgressTask. Renders the full
 * Research → Plan → Team execution pipeline with action buttons.
 *
 * Reads live data from useProgressContext (global store).
 * Local useState is used only for expand/collapse of content sections.
 */

import { useEffect, useState } from 'react';

import { ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import type { ProgressTask } from '@shared/types/progress';

import { ipc } from '@renderer/shared/lib/ipc';
import { useAgentContext } from '@renderer/shared/stores/agent-context-store';
import { useProgressContext } from '@renderer/shared/stores/progress-context-store';

import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  Heading,
  InlineAlert,
  Separator,
  Spinner,
  Stack,
  Text,
} from '@ui';

import { TeamActivityPanel } from './TeamActivityPanel';

// ─── Live Agent Preview ──────────────────────────────────

interface LiveAgentPreviewProps {
  sessionId: string | undefined;
}

/** Shows the latest assistant message from a running agent session. */
function LiveAgentPreview({ sessionId }: LiveAgentPreviewProps) {
  const messages = useAgentContext(
    (s) => (sessionId ? s.recentMessages[sessionId] ?? [] : []),
  );

  if (messages.length === 0) return null;

  // Show the last assistant message preview
  const latest = messages.at(-1) as { preview?: string; timestamp?: string } | undefined;
  const preview = latest?.preview ?? '';
  if (preview.length === 0) return null;

  return (
    <div className="bg-muted/50 mt-2 rounded-md border px-3 py-2">
      <Text className="line-clamp-3 whitespace-pre-wrap font-mono" size="sm" variant="muted">
        {preview}
      </Text>
    </div>
  );
}

// ─── Action Menu Options ─────────────────────────────────

interface ActionOption {
  label: string;
  description: string;
  prompt?: string; // undefined = use default built-in prompt
}

const RESEARCH_OPTIONS: ActionOption[] = [
  { label: 'Deep Research (default)', description: 'Comprehensive research with background, analysis, risks' },
  { label: '/deep-research', description: 'Use the deep-research skill for multi-phase investigation', prompt: 'Use /deep-research to investigate this task thoroughly. Read existing files in progress/{slug}/ first.' },
  { label: 'Quick Survey', description: 'Fast scan of relevant code and docs', prompt: 'Do a quick survey of the codebase for this task. Read existing files, scan relevant source code, and write a brief research summary to progress/{slug}/research/research.md.' },
];

const PLAN_OPTIONS: ActionOption[] = [
  { label: 'Implementation Plan (default)', description: 'Detailed plan with numbered tasks and file scope' },
  { label: '/new-plan', description: 'Use the new-plan skill for deep technical planning', prompt: 'Use /new-plan to create a detailed implementation plan. Read research at progress/{slug}/research/research.md first.' },
  { label: 'Quick Plan', description: 'Simple task breakdown without deep analysis', prompt: 'Read research at progress/{slug}/research/research.md. Create a simple, concise implementation plan at progress/{slug}/plans/plan.md with numbered tasks.' },
];

const TEAM_OPTIONS: ActionOption[] = [
  { label: 'Run Team (default)', description: 'Decompose plan into agent tasks and execute' },
  { label: '/agent-team', description: 'Use the agent-team skill for orchestrated execution', prompt: 'Use /agent-team to execute the plan at progress/{slug}/plans/plan.md' },
  { label: 'Solo Execute', description: 'Execute the plan yourself without spawning sub-agents', prompt: 'Read the plan at progress/{slug}/plans/plan.md and implement it yourself step by step. Do not spawn sub-agents.' },
];

interface ActionDropdownProps {
  label: string;
  options: ActionOption[];
  disabled: boolean;
  slug: string;
  onAction: (prompt?: string) => void;
}

function ActionDropdown({ label, options, disabled, slug, onAction }: ActionDropdownProps) {
  function resolvePrompt(option: ActionOption): string | undefined {
    if (option.prompt === undefined) return undefined;
    return option.prompt.replaceAll('{slug}', slug);
  }

  return (
    <Flex align="center" gap="none">
      <Button
        className="rounded-r-none"
        disabled={disabled}
        size="sm"
        variant="outline"
        onClick={() => { onAction(); }}
      >
        {label}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="rounded-l-none border-l-0 px-1.5"
            disabled={disabled}
            size="sm"
            variant="outline"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.label}
              onClick={() => { onAction(resolvePrompt(option)); }}
            >
              <div className="space-y-0.5">
                <Text className="font-medium" size="sm">{option.label}</Text>
                <Text size="sm" variant="muted">{option.description}</Text>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Flex>
  );
}

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
  content: string;
  activeAction: string | undefined;
  activeSessionId: string | undefined;
  isActionActive: boolean;
  expanded: boolean;
  onToggle: () => void;
  onStart: (prompt?: string) => void;
}

function ResearchSection({
  task,
  content,
  activeAction,
  activeSessionId,
  isActionActive,
  expanded,
  onToggle,
  onStart,
}: ResearchSectionProps) {
  const isResearching = activeAction === 'research';

  const researchBody = isResearching ? (
    <Stack gap="sm">
      <Flex align="center" gap="sm">
        <Spinner className="text-muted-foreground" size="sm" />
        <Text size="sm" variant="muted">Researching...</Text>
      </Flex>
      <LiveAgentPreview sessionId={activeSessionId} />
    </Stack>
  ) : (
    <ActionDropdown
      disabled={isActionActive}
      label="Deep Research"
      options={RESEARCH_OPTIONS}
      slug={task.slug}
      onAction={onStart}
    />
  );

  return (
    <Stack gap="sm">
      <Heading as="h4">Research</Heading>
      {task.hasResearch ? (
        <ContentBlock
          content={content}
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
  content: string;
  activeAction: string | undefined;
  activeSessionId: string | undefined;
  isActionActive: boolean;
  expanded: boolean;
  onToggle: () => void;
  onCreatePlan: (prompt?: string) => void;
  onSpinUpTeam: (prompt?: string) => void;
}

function PlanSection({
  task,
  content,
  activeAction,
  activeSessionId,
  isActionActive,
  expanded,
  onToggle,
  onCreatePlan,
  onSpinUpTeam,
}: PlanSectionProps) {
  const isPlanning = activeAction === 'plan';

  const planBody = isPlanning ? (
    <Stack gap="sm">
      <Flex align="center" gap="sm">
        <Spinner className="text-muted-foreground" size="sm" />
      <Text size="sm" variant="muted">Creating plan...</Text>
      </Flex>
      <LiveAgentPreview sessionId={activeSessionId} />
    </Stack>
  ) : (
    <ActionDropdown
      disabled={isActionActive || !task.hasResearch}
      label="Create Plan"
      options={PLAN_OPTIONS}
      slug={task.slug}
      onAction={onCreatePlan}
    />
  );

  return (
    <Stack gap="sm">
      <Heading as="h4">Implementation Plan</Heading>
      {task.hasPlan ? (
        <Stack gap="sm">
          <ContentBlock
            content={content}
            expanded={expanded}
            onToggle={onToggle}
          />
          <ActionDropdown
            disabled={isActionActive}
            label="Spin Up Team"
            options={TEAM_OPTIONS}
            slug={task.slug}
            onAction={onSpinUpTeam}
          />
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
  onSpinUpTeam: (prompt?: string) => void;
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
    <ActionDropdown
      disabled={isActionActive || !task.hasPlan}
      label="Spin Up Team"
      options={TEAM_OPTIONS}
      slug={task.slug}
      onAction={onSpinUpTeam}
    />
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
  const [researchContent, setResearchContent] = useState<string | null>(null);
  const [planContent, setPlanContent] = useState<string | null>(null);

  // Fetch full task content (listTasks doesn't include it)
  useEffect(() => {
    if (!task.hasResearch && !task.hasPlan) return;
    void (async () => {
      try {
        const full = await ipc('progress.getTask', { slug: task.slug });
        if (full) {
          setResearchContent(full.researchContent ?? null);
          setPlanContent(full.planContent ?? null);
        }
      } catch {
        // Best-effort content load
      }
    })();
  }, [task.slug, task.hasResearch, task.hasPlan]);

  const activeSession = task.slug in activeSessions ? activeSessions[task.slug] : null;
  const activeAction = activeSession ? activeSession.action : undefined;
  const activeSessionId = activeSession ? activeSession.sessionId : undefined;
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
        activeSessionId={activeSessionId}
        content={researchContent ?? ''}
        expanded={researchExpanded}
        isActionActive={isActionActive}
        task={task}
        onStart={(prompt) => { void startResearch(task.slug, prompt); }}
        onToggle={() => { setResearchExpanded((prev) => !prev); }}
      />

      <Separator />

      {/* ── Plan Section ─────────────────────────────── */}
      <PlanSection
        activeAction={activeAction}
        activeSessionId={activeSessionId}
        content={planContent ?? ''}
        expanded={planExpanded}
        isActionActive={isActionActive}
        task={task}
        onCreatePlan={(prompt) => { void createPlan(task.slug, prompt); }}
        onSpinUpTeam={(prompt) => { void spinUpTeam(task.slug, prompt); }}
        onToggle={() => { setPlanExpanded((prev) => !prev); }}
      />

      <Separator />

      {/* ── Team Section ─────────────────────────────── */}
      <TeamSection
        activeAction={activeAction}
        isActionActive={isActionActive}
        task={task}
        onSpinUpTeam={(prompt) => { void spinUpTeam(task.slug, prompt); }}
      />

    </Stack>
  );
}
