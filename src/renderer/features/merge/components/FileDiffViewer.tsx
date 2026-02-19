/**
 * FileDiffViewer — Wraps @git-diff-view/react DiffView with ADC theme integration
 *
 * Parses a raw unified diff string and renders it using the DiffView component.
 * Supports split (side-by-side) and unified view modes with syntax highlighting.
 */

import { useMemo } from 'react';

import { DiffView } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view.css';

import type { DiffModeEnum } from '@git-diff-view/react';

interface FileDiffViewerProps {
  diffText: string;
  fileName: string;
  lang: string;
  isDark: boolean;
  viewMode: DiffModeEnum;
}

/**
 * Parse a unified diff to extract hunks.
 * The DiffView `data.hunks` expects an array of hunk strings,
 * each starting with `@@`.
 */
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

export function FileDiffViewer({
  diffText,
  fileName,
  lang,
  isDark,
  viewMode,
}: FileDiffViewerProps) {
  const hunks = useMemo(() => parseHunks(diffText), [diffText]);
  const theme = isDark ? 'dark' : 'light';

  if (hunks.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        No changes in this file
      </div>
    );
  }

  return (
    <div className="diff-viewer-adc-theme h-full">
      <DiffView
        diffViewHighlight
        diffViewFontSize={13}
        diffViewMode={viewMode}
        diffViewTheme={theme}
        diffViewWrap={false}
        data={{
          oldFile: { fileName, fileLang: lang, content: '' },
          newFile: { fileName, fileLang: lang, content: '' },
          hunks,
        }}
      />
    </div>
  );
}
