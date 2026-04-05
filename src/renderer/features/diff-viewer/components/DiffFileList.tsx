/**
 * DiffFileList — Scrollable list of changed files with status icons and stats
 *
 * Shows A (added), M (modified), D (deleted) status badges for each file,
 * along with addition/deletion line counts. Clicking a file selects it
 * for viewing in the DiffViewer panel.
 */

import { useMemo } from 'react';

import { cn } from '@renderer/shared/lib/utils';

import { Badge, EmptyState, ScrollArea } from '@ui';

import type { DiffFileEntry, FileChangeStatus } from '../api/useDiff';

// ─── Status Badge ───────────────────────────────────────────

interface StatusBadgeProps {
  status: FileChangeStatus;
}

const STATUS_BADGE_VARIANT: Record<FileChangeStatus, 'success' | 'warning' | 'destructive'> = {
  added: 'success',
  modified: 'warning',
  deleted: 'destructive',
};

const STATUS_LABEL: Record<FileChangeStatus, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center p-0 text-[10px] font-bold"
      variant={STATUS_BADGE_VARIANT[status]}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

// ─── File Name Display ──────────────────────────────────────

function getFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts.at(-1) ?? filePath;
}

function getFileDir(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}

// ─── Grouped File Utilities ─────────────────────────────────

interface GroupedFiles {
  directory: string;
  files: DiffFileEntry[];
}

function groupByDirectory(files: DiffFileEntry[]): GroupedFiles[] {
  const groups = new Map<string, DiffFileEntry[]>();

  for (const file of files) {
    const dir = getFileDir(file.filePath);
    const key = dir.length > 0 ? dir : '(root)';
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, [file]);
    } else {
      existing.push(file);
    }
  }

  const result: GroupedFiles[] = [];
  for (const [directory, groupFiles] of groups) {
    result.push({ directory, files: groupFiles });
  }

  return result.sort((a, b) => a.directory.localeCompare(b.directory));
}

// ─── Main Component ─────────────────────────────────────────

interface DiffFileListProps {
  files: DiffFileEntry[];
  selectedFile: string | null;
  grouped?: boolean;
  onSelectFile: (filePath: string) => void;
}

export function DiffFileList({
  files,
  selectedFile,
  grouped = false,
  onSelectFile,
}: DiffFileListProps) {
  const groupedFiles = useMemo(
    () => (grouped ? groupByDirectory(files) : null),
    [files, grouped],
  );

  if (files.length === 0) {
    return (
      <EmptyState
        description="No file changes detected"
        size="sm"
        title="No changes"
      />
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-1">
        {grouped && groupedFiles !== null
          ? groupedFiles.map((group) => (
              <div key={group.directory}>
                <div className="text-muted-foreground px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
                  {group.directory}
                </div>
                {group.files.map((file) => (
                  <FileRow
                    key={file.filePath}
                    file={file}
                    isSelected={selectedFile === file.filePath}
                    showDir={false}
                    onSelect={onSelectFile}
                  />
                ))}
              </div>
            ))
          : files.map((file) => (
              <FileRow
                key={file.filePath}
                showDir
                file={file}
                isSelected={selectedFile === file.filePath}
                onSelect={onSelectFile}
              />
            ))}
      </div>
    </ScrollArea>
  );
}

// ─── File Row ───────────────────────────────────────────────

interface FileRowProps {
  file: DiffFileEntry;
  isSelected: boolean;
  showDir: boolean;
  onSelect: (filePath: string) => void;
}

function FileRow({ file, isSelected, showDir, onSelect }: FileRowProps) {
  const dir = getFileDir(file.filePath);
  const hasDir = showDir && dir.length > 0;

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs',
        'transition-colors',
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground hover:bg-muted/50',
      )}
      onClick={() => onSelect(file.filePath)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <StatusBadge status={file.status} />
        <div className="min-w-0">
          <div className="truncate font-mono font-medium">
            {getFileName(file.filePath)}
          </div>
          {hasDir ? (
            <div className="text-muted-foreground truncate text-[10px]">
              {dir}
            </div>
          ) : null}
        </div>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-1.5 font-mono">
        {file.binary ? (
          <span className="text-muted-foreground">bin</span>
        ) : (
          <>
            {file.insertions > 0 ? (
              <span className="text-success">+{file.insertions}</span>
            ) : null}
            {file.deletions > 0 ? (
              <span className="text-destructive">-{file.deletions}</span>
            ) : null}
          </>
        )}
      </div>
    </button>
  );
}
