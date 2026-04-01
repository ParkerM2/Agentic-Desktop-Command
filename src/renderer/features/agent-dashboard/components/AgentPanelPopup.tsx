/**
 * AgentPanelPopup — Full-screen modal view of an agent
 *
 * Opens as a Dialog overlay with header, metadata bar, tabs, and input box.
 * Dismissable via Escape, close button, or clicking backdrop.
 */

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCode,
  GitBranch,
  ListChecks,
  MessageSquare,
} from 'lucide-react';

import type { AgentError, AgentFileChange, AgentSession } from '@shared/types/agent-dashboard';

import { cn, formatDuration } from '@renderer/shared/lib/utils';

import {
  Badge,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ui';

import { AgentChatPanel } from './AgentChatPanel';
import { AgentStatusBar } from './AgentStatusBar';
import { QaPanel } from './QaPanel';
import { TasksTab } from './TasksTab';

// ─── Props ─────────────────────────────────────────────────

interface AgentPanelPopupProps {
  agent: AgentSession;
  open: boolean;
  onClose: () => void;
  onViewAgent?: (agentId: string) => void;
}

// ─── Metadata Grid ─────────────────────────────────────────

function MetadataGrid({ agent }: { agent: AgentSession }) {
  const duration = Date.now() - new Date(agent.startedAt).getTime();

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
      <div>
        <span className="text-muted-foreground">Model</span>
        <p className="font-medium text-foreground">{agent.model}</p>
      </div>
      <div>
        <span className="text-muted-foreground">Task</span>
        <p className="font-medium text-foreground">{agent.taskName ?? 'N/A'}</p>
      </div>
      <div className="flex items-start gap-1">
        <GitBranch className="mt-0.5 h-3 w-3 text-muted-foreground" />
        <div>
          <span className="text-muted-foreground">Branch</span>
          <p className="font-medium text-foreground">{agent.branch ?? 'N/A'}</p>
        </div>
      </div>
      <div className="flex items-start gap-1">
        <Clock className="mt-0.5 h-3 w-3 text-muted-foreground" />
        <div>
          <span className="text-muted-foreground">Duration</span>
          <p className="font-medium text-foreground">{formatDuration(duration)}</p>
        </div>
      </div>
    </div>
  );
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
  const branch = agent.branch;
  if (branch !== undefined) {
    const workMatch = /^work\/([^/]+)\//.exec(branch);
    if (workMatch?.[1] !== undefined) return workMatch[1];
    const featureMatch = /^feature\/([^/]+)/.exec(branch);
    if (featureMatch?.[1] !== undefined) return featureMatch[1];
  }
  return 'agent-dashboard-view';
}

// ─── Files Changed Tab ─────────────────────────────────────

function PopupFilesTab({ files }: { files: AgentFileChange[] }) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileCode className="mb-2 h-10 w-10" />
        <p className="text-sm">No files changed</p>
      </div>
    );
  }

  const totalAdded = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeleted = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{String(files.length)} files changed</span>
        <span className="text-success">+{String(totalAdded)} additions</span>
        <span className="text-destructive">-{String(totalDeleted)} deletions</span>
      </div>
      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/50"
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
    </div>
  );
}

// ─── Errors Tab ────────────────────────────────────────────

function PopupErrorsTab({ errors }: { errors: AgentError[] }) {
  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CheckCircle2 className="mb-2 h-10 w-10 text-success" />
        <p className="text-sm">No errors</p>
        <p className="mt-1 text-xs">Clean run — no issues detected</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[50vh]">
      <div className="space-y-2 p-4">
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

export function AgentPanelPopup({
  agent,
  open,
  onClose,
  onViewAgent,
}: AgentPanelPopupProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <AgentStatusBar agent={agent} />
          <DialogTitle className="sr-only">{agent.name}</DialogTitle>
          {agent.taskName !== undefined && agent.taskName.length > 0 && (
            <DialogDescription>{agent.taskName}</DialogDescription>
          )}
        </DialogHeader>

        <div className="px-6 pb-4">
          <MetadataGrid agent={agent} />
        </div>

        <Separator />

        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="chat">
          <TabsList className="mx-6 mt-3 shrink-0">
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
            <PopupFilesTab files={agent.filesChanged ?? []} />
          </TabsContent>

          <TabsContent className="min-h-0 flex-1" value="errors">
            <PopupErrorsTab errors={agent.errors ?? []} />
          </TabsContent>

          <TabsContent className="min-h-0 flex-1" value="tasks">
            <TasksTab className="h-full" featureSlug={deriveFeatureSlug(agent)} taskId={agent.taskId} />
          </TabsContent>
        </Tabs>

        {agent.taskId !== undefined ? (
          <div className="border-t px-6 py-4">
            <QaPanel taskId={agent.taskId} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
