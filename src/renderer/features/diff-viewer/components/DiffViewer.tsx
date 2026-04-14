/**
 * DiffViewer — GitHub-style diff viewer using @git-diff-view/react
 *
 * Renders split (side-by-side) or unified diffs with syntax highlighting,
 * line numbers, expandable context lines, and a file header showing path
 * and addition/deletion counts.
 *
 * Theme-aware: uses CSS custom properties via color-mix() for diff line
 * backgrounds. No hardcoded colors.
 */

import { useMemo } from 'react';

import { DiffModeEnum, DiffView } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view.css';
import {
  Columns2,
  FileCode,
  Minus,
  Plus,
  Rows2,
  UnfoldVertical,
} from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useThemeStore } from '@renderer/shared/stores/theme-store';

import { Button, Card, CardContent, CardHeader, EmptyState } from '@ui';

import type { DiffViewMode } from '../store';

// ─── Helpers ────────────────────────────────────────────────

/** No-op callback for optional handlers */
function noop(): void {
  /* intentional no-op */
}

/** Map file extension to a language hint for syntax highlighting */
function getFileLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'xml',
    xml: 'xml',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    sql: 'sql',
    graphql: 'graphql',
    swift: 'swift',
    kt: 'kotlin',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    lua: 'lua',
    r: 'r',
    toml: 'ini',
    ini: 'ini',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
  };
  return langMap[ext] ?? 'plaintext';
}

/** Parse a unified diff to extract hunk strings for @git-diff-view/react */
function parseHunks(diffText: string): string[] {
  if (diffText.length === 0) return [];

  const lines = diffText.split('\n');
  const hunks: string[] = [];
  let currentHunk: string[] = [];

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (currentHunk.length > 0) {
        hunks.push(currentHunk.join('\n'));
      }
      currentHunk = [line];
    } else if (currentHunk.length > 0) {
      currentHunk.push(line);
    }
  }

  if (currentHunk.length > 0) {
    hunks.push(currentHunk.join('\n'));
  }

  return hunks;
}

/** Map our store view mode to the @git-diff-view enum */
function toDiffModeEnum(viewMode: DiffViewMode): DiffModeEnum {
  return viewMode === 'split' ? DiffModeEnum.SplitGitHub : DiffModeEnum.Unified;
}

/** Resolve effective dark mode from theme store mode */
function useIsDark(): boolean {
  const themeMode = useThemeStore((s) => s.mode);
  return useMemo(() => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode === 'dark';
  }, [themeMode]);
}

// ─── File Header ────────────────────────────────────────────

interface FileHeaderProps {
  filePath: string;
  insertions: number;
  deletions: number;
  viewMode: DiffViewMode;
  expandedContext: boolean;
  onToggleViewMode: () => void;
  onToggleExpand: () => void;
}

function FileHeader({
  filePath,
  insertions,
  deletions,
  viewMode,
  expandedContext,
  onToggleViewMode,
  onToggleExpand,
}: FileHeaderProps) {
  const isSplit = viewMode === 'split';

  return (
    <div className="border-border flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-3">
        <FileCode className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="text-foreground truncate font-mono text-sm font-medium">
          {filePath}
        </span>
        <div className="flex items-center gap-2 text-xs">
          {insertions > 0 ? (
            <span className="flex items-center gap-0.5 text-success">
              <Plus className="h-3 w-3" />
              {insertions}
            </span>
          ) : null}
          {deletions > 0 ? (
            <span className="flex items-center gap-0.5 text-destructive">
              <Minus className="h-3 w-3" />
              {deletions}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Expand context toggle */}
        <Button
          aria-label={expandedContext ? 'Collapse context' : 'Expand context'}
          size="icon"
          type="button"
          variant={expandedContext ? 'secondary' : 'ghost'}
          onClick={onToggleExpand}
        >
          <UnfoldVertical className="h-3.5 w-3.5" />
        </Button>

        {/* View mode toggle group */}
        <div className="border-border flex items-center gap-0.5 rounded-md border p-0.5">
          <Button
            aria-label="Split view"
            size="icon"
            type="button"
            variant={isSplit ? 'secondary' : 'ghost'}
            onClick={() => {
              if (!isSplit) onToggleViewMode();
            }}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            aria-label="Unified view"
            size="icon"
            type="button"
            variant={isSplit ? 'ghost' : 'secondary'}
            onClick={() => {
              if (isSplit) onToggleViewMode();
            }}
          >
            <Rows2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── DiffViewer (Main Export) ───────────────────────────────

interface DiffViewerProps {
  /** Raw unified diff text for the file */
  diffText: string;
  /** Full file path (used for header and language detection) */
  filePath: string;
  /** Number of lines added */
  insertions?: number;
  /** Number of lines removed */
  deletions?: number;
  /** Split or unified view */
  viewMode?: DiffViewMode;
  /** Whether context lines are expanded */
  expandedContext?: boolean;
  /** Called when user toggles the view mode */
  onToggleViewMode?: () => void;
  /** Called when user toggles context expansion */
  onToggleExpand?: () => void;
  /** Additional CSS class */
  className?: string;
}

export function DiffViewer({
  diffText,
  filePath,
  insertions = 0,
  deletions = 0,
  viewMode = 'split',
  expandedContext = false,
  onToggleViewMode,
  onToggleExpand,
  className,
}: DiffViewerProps) {
  const isDark = useIsDark();
  const hunks = useMemo(() => parseHunks(diffText), [diffText]);
  const lang = useMemo(() => getFileLang(filePath), [filePath]);
  const diffMode = toDiffModeEnum(viewMode);
  const theme = isDark ? 'dark' : 'light';

  if (hunks.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="px-4 py-2">
          <div className="flex items-center gap-2">
            <FileCode className="text-muted-foreground h-4 w-4" />
            <span className="font-mono text-sm">{filePath}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            className="h-24"
            description="No changes in this file"
            size="sm"
            title="No changes"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <FileHeader
        deletions={deletions}
        expandedContext={expandedContext}
        filePath={filePath}
        insertions={insertions}
        viewMode={viewMode}
        onToggleExpand={onToggleExpand ?? noop}
        onToggleViewMode={onToggleViewMode ?? noop}
      />
      <CardContent className="diff-viewer-theme-override p-0">
        <DiffView
          diffViewHighlight
          diffViewFontSize={13}
          diffViewMode={diffMode}
          diffViewTheme={theme}
          diffViewWrap={false}
          data={{
            oldFile: { fileName: filePath, fileLang: lang, content: '' },
            newFile: { fileName: filePath, fileLang: lang, content: '' },
            hunks,
          }}
        />
      </CardContent>
    </Card>
  );
}
