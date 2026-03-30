/**
 * Diff Viewer feature — public API
 *
 * GitHub-style diff viewer using @git-diff-view/react with
 * split/unified views, syntax highlighting, and theme integration.
 */

// API hooks
export { useDiffSummary, useFileDiffContent } from './api/useDiff';
export type { DiffFileEntry, DiffSummary, FileChangeStatus } from './api/useDiff';
export { diffKeys } from './api/queryKeys';

// Store
export { useDiffViewerUI } from './store';
export type { DiffViewMode } from './store';

// Components
export { DiffViewer } from './components/DiffViewer';
export { DiffFileList } from './components/DiffFileList';
