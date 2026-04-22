/**
 * BranchDiffPanel — Compare two branches with a file list and GitHub-style diff view.
 *
 * Rendered as the "Diff" tab inside GitPage. Uses the diff-viewer feature's
 * DiffViewer + DiffFileList components with data fetched via the merge IPC channels.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@ui';

import { DiffFileList, DiffViewer } from '@features/diff-viewer';

import { useBranchDiffPanel } from './useBranchDiffPanel';

interface BranchDiffPanelProps {
  repoPath: string;
}

export function BranchDiffPanel({ repoPath }: BranchDiffPanelProps) {
  const {
    branches,
    sourceBranch,
    setSourceBranch,
    targetBranch,
    setTargetBranch,
    expandedContext,
    selectedFile,
    selectFile,
    setViewMode,
    toggleExpandedContext,
    viewMode,
    diffSummary,
    fileDiff,
    files,
    selectedFileStats,
  } = useBranchDiffPanel(repoPath);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Branch selectors */}
      <div className="flex items-center gap-2">
        <Text className="shrink-0 text-sm" variant="muted">
          Compare
        </Text>
        <Select value={sourceBranch ?? ''} onValueChange={setSourceBranch}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Source branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.name} value={b.name}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Text className="shrink-0 text-sm" variant="muted">
          into
        </Text>
        <Select value={targetBranch ?? ''} onValueChange={setTargetBranch}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Target branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.name} value={b.name}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {diffSummary !== undefined && (
          <Text className="ml-auto text-xs" variant="muted">
            {diffSummary.changedFileCount} files &nbsp;
            <span className="text-success">+{diffSummary.totalInsertions}</span>
            {' / '}
            <span className="text-destructive">-{diffSummary.totalDeletions}</span>
          </Text>
        )}
      </div>

      {/* File list + diff area */}
      {sourceBranch !== null && targetBranch !== null ? (
        <div className="flex min-h-0 flex-1 gap-3">
          <div className="w-64 shrink-0 overflow-y-auto">
            <DiffFileList
              grouped
              files={files}
              selectedFile={selectedFile}
              onSelectFile={selectFile}
            />
          </div>
          <div className="min-w-0 flex-1 overflow-auto">
            {selectedFile !== null && fileDiff !== undefined ? (
              <DiffViewer
                deletions={selectedFileStats?.deletions}
                diffText={fileDiff.diff}
                expandedContext={expandedContext}
                filePath={selectedFile}
                insertions={selectedFileStats?.insertions}
                viewMode={viewMode}
                onToggleExpand={toggleExpandedContext}
                onToggleViewMode={() => setViewMode(viewMode === 'split' ? 'unified' : 'split')}
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                {files.length > 0
                  ? 'Select a file to view its diff.'
                  : 'No changes between these branches.'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Select two branches to compare.
        </div>
      )}
    </div>
  );
}
