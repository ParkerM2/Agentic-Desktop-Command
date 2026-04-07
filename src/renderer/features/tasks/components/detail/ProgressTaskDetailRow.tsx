/**
 * ProgressTaskDetailRow
 *
 * Expanded row component for a ProgressTask. Renders the full
 * Research → Plan → Team execution pipeline with action buttons.
 *
 * Reads live data from React Query hooks (useProgressTasks).
 * Local useState is used only for expand/collapse of content sections.
 */

import { useEffect, useMemo, useState } from 'react';

import { ChevronDown } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ProgressTask } from '@shared/types/progress';

import { ipc } from '@renderer/shared/lib/ipc';
import { useAgentContext } from '@renderer/shared/stores/agent-context-store';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { useProgressTasks } from '../../api/useProgress';
import {
  useArchiveProgressTask,
  useCreatePlan,
  useRunWorkflow,
  useSpinUpTeam,
  useStartResearch,
} from '../../api/useProgressMutations';

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

import { extractSummaryBlock } from './summary-block-parser';
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
  handler?: 'teamLead'; // special handler instead of default prompt-based action
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
  { label: 'Team Lead', description: 'Hand off plan to a team-lead session (spawns one if needed)', handler: 'teamLead' },
  { label: 'Direct Execute', description: 'Decompose plan into agent tasks and execute directly', prompt: undefined },
  { label: '/agent-team', description: 'Use the agent-team skill for orchestrated execution', prompt: 'Use /agent-team to execute the plan at progress/{slug}/plans/plan.md' },
  { label: 'Solo Execute', description: 'Execute the plan yourself without spawning sub-agents', prompt: 'Read the plan at progress/{slug}/plans/plan.md and implement it yourself step by step. Do not spawn sub-agents.' },
];

interface ActionDropdownProps {
  label: string;
  options: ActionOption[];
  disabled: boolean;
  slug: string;
  onAction: (prompt?: string) => void;
  onSpecialAction?: (handler: string) => void;
}

function ActionDropdown({ label, options, disabled, slug, onAction, onSpecialAction }: ActionDropdownProps) {
  function resolvePrompt(option: ActionOption): string | undefined {
    if (option.prompt === undefined) return undefined;
    return option.prompt.replaceAll('{slug}', slug);
  }

  function handleOptionClick(option: ActionOption) {
    if (option.handler && onSpecialAction) {
      onSpecialAction(option.handler);
    } else {
      onAction(resolvePrompt(option));
    }
  }

  // Default click uses the first option's behavior
  function handleDefaultClick() {
    const first = options[0];
    if (first.handler && onSpecialAction) {
      onSpecialAction(first.handler);
    } else {
      onAction();
    }
  }

  return (
    <Flex align="center" gap="none">
      <Button
        className="rounded-r-none"
        disabled={disabled}
        size="sm"
        variant="outline"
        onClick={handleDefaultClick}
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
              onClick={() => { handleOptionClick(option); }}
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

type StepStatus = 'done' | 'active' | 'pending';

function deriveStepStatus(isDone: boolean, isActive: boolean): StepStatus {
  if (isDone) return 'done';
  if (isActive) return 'active';
  return 'pending';
}

function stepStatusDotClass(status: StepStatus): string {
  if (status === 'done') return 'bg-success';
  if (status === 'active') return 'bg-info animate-pulse';
  return 'bg-muted-foreground/30';
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

// ─── Styled Markdown (matches agent chat rendering) ─────

const remarkPlugins = [remarkGfm];

const mdComponents: React.ComponentProps<typeof Markdown>['components'] = {
  code: ({ className: codeClassName, children: codeChildren, ...rest }) => {
    const isBlock = (codeClassName ?? '').includes('language-');
    if (isBlock) {
      return (
        <pre className="bg-background/80 my-2 overflow-x-auto rounded-md border border-border p-3">
          <code className={`font-mono text-xs ${codeClassName ?? ''}`}>{codeChildren}</code>
        </pre>
      );
    }
    return (
      <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-xs text-foreground" {...rest}>
        {codeChildren}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50 text-xs font-medium text-foreground">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-3 py-1.5 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-3 py-1.5 text-foreground/90">{children}</td>
  ),
  h1: ({ children }) => (
    <h1 className="mb-1.5 mt-3 text-base font-semibold text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 mt-3 text-sm font-semibold text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-medium text-foreground">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-1.5 text-sm leading-relaxed text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 ml-4 list-disc space-y-0.5 text-sm text-foreground/90">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 ml-4 list-decimal space-y-0.5 text-sm text-foreground/90">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a className="text-primary hover:underline" href={href}>{children}</a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="text-foreground/90">{children}</em>,
  pre: ({ children }) => <div className="my-2">{children}</div>,
};

// ─── ContentBlock Sub-component ──────────────────────────

interface ContentBlockProps {
  content: string;
  expanded: boolean;
  onToggle: () => void;
}

function ContentBlock({ content, expanded, onToggle }: ContentBlockProps) {
  const summaryBlock = extractSummaryBlock(content);
  const previewMarkdown = summaryBlock ?? content;

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      {expanded ? null : (
        <div className={summaryBlock ? '' : 'line-clamp-6'}>
          <Markdown components={mdComponents} remarkPlugins={remarkPlugins}>
            {previewMarkdown}
          </Markdown>
        </div>
      )}
      <CollapsibleContent>
        <Markdown components={mdComponents} remarkPlugins={remarkPlugins}>
          {content}
        </Markdown>
      </CollapsibleContent>
      <CollapsibleTrigger asChild>
        <Button className="mt-2 h-7 px-2 text-xs text-muted-foreground" size="sm" variant="ghost">
          {expanded ? 'Collapse' : 'View full'}
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
  expanded: boolean;
  onToggle: () => void;
}

function ResearchSection({
  task,
  content,
  activeAction,
  activeSessionId,
  expanded,
  onToggle,
}: ResearchSectionProps) {
  const isResearching = activeAction === 'research';

  const emptyBody = isResearching ? (
    <Stack gap="sm">
      <Flex align="center" gap="sm">
        <Spinner className="text-muted-foreground" size="sm" />
        <Text size="sm" variant="muted">Researching...</Text>
      </Flex>
      <LiveAgentPreview sessionId={activeSessionId} />
    </Stack>
  ) : (
    <Text size="sm" variant="muted">No research yet. Use the footer actions to start.</Text>
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
        emptyBody
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
  expanded: boolean;
  onToggle: () => void;
}

function PlanSection({
  task,
  content,
  activeAction,
  activeSessionId,
  expanded,
  onToggle,
}: PlanSectionProps) {
  const isPlanning = activeAction === 'plan';

  const emptyBody = isPlanning ? (
    <Stack gap="sm">
      <Flex align="center" gap="sm">
        <Spinner className="text-muted-foreground" size="sm" />
        <Text size="sm" variant="muted">Creating plan...</Text>
      </Flex>
      <LiveAgentPreview sessionId={activeSessionId} />
    </Stack>
  ) : (
    <Text size="sm" variant="muted">No plan yet. Use the footer actions to create one.</Text>
  );

  return (
    <Stack gap="sm">
      <Heading as="h4">Implementation Plan</Heading>
      {task.hasPlan ? (
        <ContentBlock
          content={content}
          expanded={expanded}
          onToggle={onToggle}
        />
      ) : (
        emptyBody
      )}
    </Stack>
  );
}

// ─── TeamSection Sub-component ───────────────────────────

interface TeamSectionProps {
  task: ProgressTask;
  activeAction: string | undefined;
}

function TeamSection({ task, activeAction }: TeamSectionProps) {
  const isExecuting = activeAction === 'team';
  const isComplete = task.status === 'done' || task.status === 'review';
  const showActivityPanel = task.status === 'executing' || task.status === 'review';
  const completionLabel = task.status === 'done' ? 'Pipeline Complete' : 'Ready for Review';
  const teamStatusLabel = task.status === 'done' ? 'Completed' : 'In Review';

  const emptyBody = isExecuting ? (
    <Flex align="center" gap="sm">
      <Spinner className="text-muted-foreground" size="sm" />
      <Text size="sm" variant="muted">Spinning up team...</Text>
    </Flex>
  ) : (
    <Text size="sm" variant="muted">No team tasks yet. Use the footer actions to spin up a team.</Text>
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
        emptyBody
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
  const { data: allTasks = [] } = useProgressTasks();
  const startResearchMutation = useStartResearch();
  const createPlanMutation = useCreatePlan();
  const spinUpTeamMutation = useSpinUpTeam();
  const runWorkflowMutation = useRunWorkflow();
  const archiveTaskMutation = useArchiveProgressTask();
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);

  // Derive activeSessions from task statuses (was previously managed by ProgressContextHydrator)
  const activeSessions = useMemo(() => {
    const sessions: Record<string, { sessionId: string; action: string }> = {};
    for (const t of allTasks) {
      if (t.status === 'researching') {
        sessions[t.slug] = { sessionId: t.lastSessionId ?? '', action: 'research' };
      } else if (t.status === 'planning') {
        sessions[t.slug] = { sessionId: t.lastSessionId ?? '', action: 'plan' };
      } else if (t.status === 'executing') {
        sessions[t.slug] = { sessionId: t.lastSessionId ?? '', action: 'team' };
      }
    }
    return sessions;
  }, [allTasks]);

  type PipelineTab = 'research' | 'plan' | 'execute';
  const [activeTab, setActiveTab] = useState<PipelineTab>(() => {
    if (task.hasTeamTasks) return 'execute';
    if (task.hasPlan) return 'plan';
    return 'research';
  });
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

  // Team Lead handoff: uses workspace.handOffPlan to send plan to a team-lead
  // session (spawns one if none available). This is the pre-built setup with
  // worktrees, CLAUDE.md generation, and enforcement hooks.
  function handleTeamLeadHandoff() {
    if (!activeProjectId) return;
    const planPath = `progress/${task.slug}/plans/plan.md`;
    void ipc('workspace.handOffPlan', { projectId: activeProjectId, planPath });
  }

  // Dispatch handler for special actions from dropdowns
  function handleSpecialAction(handler: string) {
    if (handler === 'teamLead') {
      handleTeamLeadHandoff();
    }
  }

  // Retry logic: trigger whichever step is missing
  function handleRetry() {
    if (task.hasResearch && task.hasPlan) {
      spinUpTeamMutation.mutate({ slug: task.slug });
    } else if (task.hasResearch) {
      createPlanMutation.mutate({ slug: task.slug });
    } else {
      startResearchMutation.mutate({ slug: task.slug });
    }
  }

  // Tab status indicators
  const researchStatus = deriveStepStatus(task.hasResearch, activeAction === 'research');
  const planStatus = deriveStepStatus(task.hasPlan, activeAction === 'plan');
  const executeStatus = deriveStepStatus(
    task.status === 'done' || task.status === 'review',
    activeAction === 'team' || task.hasTeamTasks,
  );

  return (
    <div className="flex max-h-[60vh] flex-col">

      {/* ── Error Banner ─────────────────────────────── */}
      {task.status === 'error' ? (
        <div className="px-4 pt-4">
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
        </div>
      ) : null}

      {/* ── Pipeline Tabs (fixed at top) ─────────────── */}
      <div className="flex gap-0 border-b border-border">
        {([
          { key: 'research' as PipelineTab, label: 'Research', status: researchStatus },
          { key: 'plan' as PipelineTab, label: 'Plan', status: planStatus },
          { key: 'execute' as PipelineTab, label: 'Execute', status: executeStatus },
        ]).map((tab) => (
          <Button
            key={tab.key}
            className="flex-1 justify-center gap-2"
            size="sm"
            variant={activeTab === tab.key ? 'secondary' : 'ghost'}
            onClick={() => { setActiveTab(tab.key); }}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${stepStatusDotClass(tab.status)}`} />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ── Scrollable Tab Content ────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'research' ? (
          <ResearchSection
            activeAction={activeAction}
            activeSessionId={activeSessionId}
            content={researchContent ?? ''}
            expanded={researchExpanded}
            task={task}
            onToggle={() => { setResearchExpanded((prev) => !prev); }}
          />
        ) : null}

        {activeTab === 'plan' ? (
          <PlanSection
            activeAction={activeAction}
            activeSessionId={activeSessionId}
            content={planContent ?? ''}
            expanded={planExpanded}
            task={task}
            onToggle={() => { setPlanExpanded((prev) => !prev); }}
          />
        ) : null}

        {activeTab === 'execute' ? (
          <TeamSection
            activeAction={activeAction}
            task={task}
          />
        ) : null}
      </div>

      {/* ── Sticky Footer ────────────────────────────── */}
      <div className="sticky bottom-0 border-t border-border bg-muted px-4 py-2">
        <Flex align="center" gap="sm" wrap="wrap">
          {/* Left: Info counts */}
          <Flex align="center" gap="sm">
            <Badge size="sm" variant="secondary">
              Docs: {task.hasResearch ? 1 : 0}
            </Badge>
            <Badge size="sm" variant="secondary">
              Plans: {task.hasPlan ? 1 : 0}
            </Badge>
            {hasPr ? (
              <Badge size="sm" variant={prStatusVariant(task.prStatus)}>
                PR #{task.prNumber}
              </Badge>
            ) : (
              <Badge size="sm" variant="outline">PR: N/A</Badge>
            )}
          </Flex>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Action dropdowns + links + workflow + archive */}
          <Flex align="center" gap="sm" wrap="nowrap">
            <ActionDropdown
              disabled={isActionActive}
              label="Research"
              options={RESEARCH_OPTIONS}
              slug={task.slug}
              onAction={(prompt) => { startResearchMutation.mutate({ slug: task.slug, prompt }); }}
            />
            <ActionDropdown
              disabled={isActionActive || !task.hasResearch}
              label="Plan"
              options={PLAN_OPTIONS}
              slug={task.slug}
              onAction={(prompt) => { createPlanMutation.mutate({ slug: task.slug, prompt }); }}
            />
            <ActionDropdown
              disabled={isActionActive || !task.hasPlan}
              label="Execute"
              options={TEAM_OPTIONS}
              slug={task.slug}
              onAction={(prompt) => { spinUpTeamMutation.mutate({ slug: task.slug, prompt }); }}
              onSpecialAction={handleSpecialAction}
            />

            <Separator className="h-4" orientation="vertical" />

            {hasJira ? (
              <Button asChild size="sm" variant="outline">
                <a href={task.jiraUrl} rel="noreferrer" target="_blank">
                  <Badge size="sm" variant="info">{task.jiraTicket}</Badge>
                </a>
              </Button>
            ) : (
              <Button disabled size="sm" variant="outline">Link Ticket</Button>
            )}
            {hasPr ? (
              <Button asChild size="sm" variant="outline">
                <a href={task.prUrl} rel="noreferrer" target="_blank">
                  <Text size="sm">#{task.prNumber}</Text>
                </a>
              </Button>
            ) : (
              <Button disabled size="sm" variant="outline">Link PR</Button>
            )}

            <Separator className="h-4" orientation="vertical" />

            <Button disabled={isActionActive} size="sm" variant="primary" onClick={() => { runWorkflowMutation.mutate({ slug: task.slug }); }}>
              Run Workflow
            </Button>
            <Button className="text-destructive hover:text-destructive" disabled={isActionActive} size="sm" variant="outline" onClick={() => { archiveTaskMutation.mutate({ slug: task.slug }); }}>
              Archive
            </Button>
          </Flex>
        </Flex>
      </div>

    </div>
  );
}
