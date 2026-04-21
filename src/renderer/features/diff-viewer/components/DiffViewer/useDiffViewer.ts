import { useMemo } from 'react';

import { DiffModeEnum } from '@git-diff-view/react';

import { useThemeStore } from '@renderer/shared/stores/theme-store';

import type { DiffViewMode } from '../../store';

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

export function useDiffViewer(diffText: string, filePath: string, viewMode: DiffViewMode) {
  const themeMode = useThemeStore((s) => s.mode);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode === 'dark';
  }, [themeMode]);

  const hunks = useMemo(() => parseHunks(diffText), [diffText]);
  const lang = useMemo(() => getFileLang(filePath), [filePath]);
  const diffMode = toDiffModeEnum(viewMode);
  const theme: 'dark' | 'light' = isDark ? 'dark' : 'light';

  return { hunks, lang, diffMode, theme };
}
