/**
 * PrDiffView — File-by-file unified diff for a GitHub pull request
 */

import { ChevronDown, ChevronRight, FileCode } from 'lucide-react';

import type { PrDiffFile } from '@shared/ipc/github/schemas';

import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
  Skeleton,
  Spinner,
  Text,
} from '@ui';

import { usePrDiff } from '../api/useGitHub';
import { useGitHubStore } from '../store';

// ── Types ────────────────────────────────────────────────────

interface PrDiffViewProps {
  prNumber: number | null;
}

// ── Helpers ──────────────────────────────────────────────────

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'info' | 'warning';

function getStatusVariant(status: PrDiffFile['status']): StatusVariant {
  if (status === 'added') return 'success';
  if (status === 'removed') return 'destructive';
  if (status === 'renamed') return 'info';
  return 'warning';
}

function getStatusLabel(status: PrDiffFile['status']): string {
  if (status === 'added') return 'added';
  if (status === 'removed') return 'removed';
  if (status === 'renamed') return 'renamed';
  return 'modified';
}

type LineType = 'addition' | 'deletion' | 'hunk' | 'context';

function getLineType(line: string): LineType {
  if (line.startsWith('+')) return 'addition';
  if (line.startsWith('-')) return 'deletion';
  if (line.startsWith('@@')) return 'hunk';
  return 'context';
}

function getLineClassName(lineType: LineType): string {
  if (lineType === 'addition') return 'bg-green-950/40 text-green-400';
  if (lineType === 'deletion') return 'bg-red-950/40 text-red-400';
  if (lineType === 'hunk') return 'text-muted-foreground';
  return '';
}

// ── Sub-components ───────────────────────────────────────────

const SKELETON_KEYS = ['sk-a', 'sk-b', 'sk-c'] as const;

function DiffFileSkeleton() {
  return (
    <div className="space-y-2">
      {SKELETON_KEYS.map((key) => (
        <Skeleton key={key} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

interface DiffLine {
  lineKey: string;
  content: string;
}

function parseDiffLines(patch: string): DiffLine[] {
  return patch.split('\n').map((content, idx) => ({ lineKey: `l${idx}`, content }));
}

function DiffFileItem({ file }: { file: PrDiffFile }) {
  const lines: DiffLine[] = file.patch === null ? [] : parseDiffLines(file.patch);
  const hasPatch = file.patch !== null;

  return (
    <Collapsible className="border-border overflow-hidden rounded-md border">
      <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors">
        <span className="text-muted-foreground data-[state=open]:hidden">
          <ChevronRight className="h-4 w-4 shrink-0" />
        </span>
        <span className="text-muted-foreground hidden data-[state=open]:block">
          <ChevronDown className="h-4 w-4 shrink-0" />
        </span>
        <FileCode className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{file.filename}</span>
        <Badge size="sm" variant={getStatusVariant(file.status)}>
          {getStatusLabel(file.status)}
        </Badge>
        {(file.additions > 0 || file.deletions > 0) ? (
          <span className="flex shrink-0 items-center gap-1 text-xs">
            {file.additions > 0 ? (
              <span className="text-green-400">+{String(file.additions)}</span>
            ) : null}
            {file.deletions > 0 ? (
              <span className="text-red-400">-{String(file.deletions)}</span>
            ) : null}
          </span>
        ) : null}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Separator />
        <div>
          {hasPatch ? (
            <pre className="overflow-x-auto p-0 font-mono text-xs leading-5">
              {lines.map(({ lineKey, content }) => {
                const lineType = getLineType(content);
                return (
                  <span
                    key={lineKey}
                    className={`block px-3 py-0 ${getLineClassName(lineType)}`}
                  >
                    {content}
                  </span>
                );
              })}
            </pre>
          ) : (
            <div className="px-3 py-3">
              <Text className="text-xs italic" variant="muted">
                Binary file — diff not available
              </Text>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Component ────────────────────────────────────────────────

export function PrDiffView({ prNumber }: PrDiffViewProps) {
  const { githubOwner: owner, githubRepo: repo } = useGitHubStore();
  const { data: files, isLoading } = usePrDiff(prNumber);

  const enabled = prNumber !== null && owner.length > 0 && repo.length > 0;

  function renderContent(): React.ReactNode {
    if (!enabled) return null;

    if (isLoading) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-center py-4">
            <Spinner className="text-muted-foreground" size="sm" />
          </div>
          <DiffFileSkeleton />
        </div>
      );
    }

    const fileList = files ?? [];

    if (fileList.length === 0) {
      return (
        <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
          No file changes found
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {fileList.map((file) => (
          <DiffFileItem key={file.filename} file={file} />
        ))}
      </div>
    );
  }

  return <div className="mt-2">{renderContent()}</div>;
}
