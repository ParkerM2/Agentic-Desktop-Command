import { useMemo } from 'react';

import type { DiffFileEntry } from '../../api/useDiff';

interface GroupedFiles {
  directory: string;
  files: DiffFileEntry[];
}

function getFileDir(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
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

export function useDiffFileList(files: DiffFileEntry[], grouped: boolean) {
  const groupedFiles = useMemo(
    () => (grouped ? groupByDirectory(files) : null),
    [files, grouped],
  );

  return { groupedFiles };
}
