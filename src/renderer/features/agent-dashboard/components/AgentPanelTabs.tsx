/**
 * AgentPanelTabs — Tab content sub-components for AgentPanelExpanded
 *
 * FilesChangedTab and ErrorsTab extracted for size compliance.
 */

import { AlertTriangle, CheckCircle2, FileCode } from 'lucide-react';

import type { AgentError, AgentFileChange } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { Card, CardContent, ScrollArea, Text } from '@ui';

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

// ─── Files Changed Tab ─────────────────────────────────────

export function FilesChangedTab({ files }: { files: AgentFileChange[] }) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileCode className="mb-2 h-8 w-8" />
        <Text className="text-sm">No files changed</Text>
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

export function ErrorsTab({ errors }: { errors: AgentError[] }) {
  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="mb-2 h-8 w-8 text-success" />
        <Text className="text-sm">No errors</Text>
        <Text className="mt-1 text-xs">Clean run — no issues detected</Text>
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
                  <Text className="text-sm text-foreground">{error.message}</Text>
                  {error.source !== undefined && error.source.length > 0 ? (
                    <Text className="mt-1 font-mono text-xs text-muted-foreground">
                      {error.source}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </Text>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
