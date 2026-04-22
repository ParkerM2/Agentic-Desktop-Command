/**
 * AgentPanelExpanded — Full in-place panel with tabs
 *
 * Expands in-place within the layout. Shows full agent detail with tabs:
 * Chat, Files Changed, Errors.
 */

import { AlertTriangle, FileCode, ListChecks, MessageSquare, Minimize2, Maximize2 } from 'lucide-react';

import type { AgentSession } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import {
  Badge,
  Button,
  Card,
  CardHeader,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@ui';

import { AgentChatPanel } from '../AgentChatPanel';
import { ErrorsTab, FilesChangedTab } from '../AgentPanelTabs';
import { AgentStatusBar } from '../AgentStatusBar';
import { QaPanel } from '../QaPanel';
import { TasksTab } from '../TasksTab';

// ─── Props ─────────────────────────────────────────────────

interface AgentPanelExpandedProps {
  agent: AgentSession;
  className?: string;
  onCollapse: () => void;
  onPopup: () => void;
  onViewAgent?: (agentId: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────

function deriveFeatureSlug(agent: AgentSession): string {
  const { branch } = agent;
  if (branch !== undefined) {
    const workMatch = /^work\/([^/]+)\//.exec(branch);
    if (workMatch?.[1] !== undefined) return workMatch[1];
    const featureMatch = /^feature\/([^/]+)/.exec(branch);
    if (featureMatch?.[1] !== undefined) return featureMatch[1];
  }
  return 'agent-dashboard-view';
}

// ─── Token Usage Section ────────────────────────────────────

function formatTokenCount(count: number): string {
  if (count >= 1000) return `${Math.round(count / 1000)}k`;
  return String(count);
}

function formatCost(cost: number): string {
  if (cost === 0) return '';
  if (cost < 0.01) return '< $0.01';
  return `$${cost.toFixed(2)}`;
}

interface TokenUsageSectionProps {
  inputTokens: number;
  outputTokens: number;
}

function TokenUsageSection({ inputTokens, outputTokens }: TokenUsageSectionProps) {
  const hasTokens = inputTokens > 0 || outputTokens > 0;
  if (!hasTokens) return null;

  const cost = ((inputTokens * 3) + (outputTokens * 15)) / 1_000_000;
  const costLabel = formatCost(cost);

  return (
    <>
    <Separator />
    <div className="px-4 py-2">
      <Text className="mb-1.5 font-medium" size="sm">Token Usage</Text>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Text size="sm" variant="muted">Input</Text>
          <Text size="sm">{formatTokenCount(inputTokens)}</Text>
        </div>
        <Separator className="h-3" orientation="vertical" />
        <div className="flex items-center gap-1.5">
          <Text size="sm" variant="muted">Output</Text>
          <Text size="sm">{formatTokenCount(outputTokens)}</Text>
        </div>
        {costLabel.length > 0 ? (
          <>
            <Separator className="h-3" orientation="vertical" />
            <div className="flex items-center gap-1.5">
              <Text size="sm" variant="muted">Est. Cost</Text>
              <Text size="sm">{costLabel}</Text>
            </div>
          </>
        ) : null}
      </div>
    </div>
    </>
  );
}

// ─── Component ─────────────────────────────────────────────

export function AgentPanelExpanded({
  agent,
  className,
  onCollapse,
  onPopup,
  onViewAgent,
}: AgentPanelExpandedProps) {
  return (
    <Card className={cn('flex h-full flex-col overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
        <AgentStatusBar agent={agent} className="min-w-0 flex-1" />
        <div className="ml-2 flex shrink-0 gap-1">
          <Button
            aria-label="Collapse panel"
            size="icon"
            variant="ghost"
            onClick={onCollapse}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            aria-label="Open popup"
            size="icon"
            variant="ghost"
            onClick={onPopup}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      {agent.taskName !== undefined && agent.taskName.length > 0 ? (
        <>
          <Separator />
          <div className="px-4 py-2">
            <Text className="text-xs text-muted-foreground">
              Task: {agent.taskName}
              {agent.branch !== undefined && agent.branch.length > 0 ? (
                <span className="ml-2">Branch: {agent.branch}</span>
              ) : null}
            </Text>
          </div>
        </>
      ) : null}

      <TokenUsageSection
        inputTokens={agent.tokenUsage.input}
        outputTokens={agent.tokenUsage.output}
      />

      <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="chat">
        <TabsList className="mx-4 shrink-0">
          <TabsTrigger value="chat">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileCode className="mr-1.5 h-3.5 w-3.5" />
            Files
            {(agent.filesChanged ?? []).length > 0 ? (
              <Badge className="ml-1.5" size="sm" variant="secondary">
                {String((agent.filesChanged ?? []).length)}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Errors
            {(agent.errors ?? []).length > 0 ? (
              <Badge className="ml-1.5" size="sm" variant="destructive">
                {String((agent.errors ?? []).length)}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent className="min-h-0 flex-1" value="chat">
          <AgentChatPanel
            className="h-full"
            messages={agent.messages ?? []}
            onViewAgent={onViewAgent}
          />
        </TabsContent>

        <TabsContent className="min-h-0 flex-1" value="files">
          <FilesChangedTab files={agent.filesChanged ?? []} />
        </TabsContent>

        <TabsContent className="min-h-0 flex-1" value="errors">
          <ErrorsTab errors={agent.errors ?? []} />
        </TabsContent>

        <TabsContent className="min-h-0 flex-1" value="tasks">
          <TasksTab featureSlug={deriveFeatureSlug(agent)} taskId={agent.taskId} />
        </TabsContent>
      </Tabs>

      {agent.taskId === undefined ? null : (
        <>
          <Separator />
          <div className="p-3">
            <QaPanel taskId={agent.taskId} />
          </div>
        </>
      )}
    </Card>
  );
}
