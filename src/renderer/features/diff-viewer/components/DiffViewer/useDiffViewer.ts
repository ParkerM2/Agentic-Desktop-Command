import { useMemo } from 'react';

import { DiffModeEnum } from '@git-diff-view/react';

import { useDarkMode } from '@renderer/shared/hooks/useDarkMode';
import { useFileLang } from '@renderer/shared/hooks/useFileLangMap';

import type { DiffViewMode } from '../../store';

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
  const isDark = useDarkMode();

  const hunks = useMemo(() => parseHunks(diffText), [diffText]);
  const lang = useFileLang(filePath);
  const diffMode = toDiffModeEnum(viewMode);
  const theme: 'dark' | 'light' = isDark ? 'dark' : 'light';

  return { hunks, lang, diffMode, theme };
}
