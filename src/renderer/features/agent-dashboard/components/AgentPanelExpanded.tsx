/**
 * AgentPanelExpanded — Full in-place panel with tabs
 *
 * Expands in-place within the layout. Shows full agent detail with tabs:
 * Chat, Files Changed, Errors.
 */

import { AlertTriangle, CheckCircle2, FileCode, ListChecks, MessageSquare, Minimize2, Maximize2 } from 'lucide-react';

import type { AgentError, AgentFileChange, AgentSession } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  ScrollArea,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@ui';

import { AgentChatPanel } from './AgentChatPanel';
import { AgentStatusBar } from './AgentStatusBar';
import { QaPanel } from './QaPanel';
import { TasksTab } from './TasksTab';

// ─── Props ─────────────────────────────────────────────────

interface AgentPanelExpandedProps {
  agent: AgentSession;
  className?: string;
  onCollapse: () => void;
  onPopup: () => void;
  onViewAgent?: (agentId: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────

function getFileStatusChar(status: AgentFileChange['status']): string {
  if (status === 'added') return 'A';
  if (status === 'deleted') return 'D';
  return 'M';
}

function getFileStatusColor(status: AgentFileChange['status']): string {
  if (status === 'added') return 'text-success';
  if (status === 'deleted') return 'text-destructive';
  return 'text-warning';
}

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
  if (count >= 1000) {
    return `${Math.round(count / 1000)}k`;
  }
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
    <div className="border-t px-4 py-2">
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
  );
}

// ─── Files Changed Tab ─────────────────────────────────────

function FilesChangedTab({ files }: { files: AgentFileChange[] }) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileCode className="mb-2 h-8 w-8" />
        <p className="text-sm">No files changed</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {files.map((file) => (
          <div
            key={file.path}
            className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50"
          >
            <span className={cn('w-4 font-mono font-bold', getFileStatusColor(file.status))}>
              {getFileStatusChar(file.status)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-foreground">
              {file.path}
            </span>
            <span className="shrink-0 text-muted-foreground">
              <span className="text-success">+{String(file.additions)}</span>
              {' '}
              <span className="text-destructive">-{String(file.deletions)}</span>
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ─── Errors Tab ────────────────────────────────────────────

function ErrorsTab({ errors }: { errors: AgentError[] }) {
  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="mb-2 h-8 w-8 text-success" />
        <p className="text-sm">No errors</p>
        <p className="mt-1 text-xs">Clean run — no issues detected</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {errors.map((error) => (
          <Card
            key={error.id}
            className={cn(
              'overflow-hidden',
              error.severity === 'error' ? 'border-destructive' : 'border-warning',
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    error.severity === 'error' ? 'text-destructive' : 'text-warning',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{error.message}</p>
                  {error.source !== undefined && error.source.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {error.source}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
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

      {agent.taskName !== undefined && agent.taskName.length > 0 && (
        <div className="border-t px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Task: {agent.taskName}
            {agent.branch !== undefined && agent.branch.length > 0 && (
              <span className="ml-2">Branch: {agent.branch}</span>
            )}
          </p>
        </div>
      )}

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
        <div className="border-t p-3">
          <QaPanel taskId={agent.taskId} />
        </div>
      )}
    </Card>
  );
}
