/**
 * Merge feature — public API
 */

// API hooks
export {
  useAbortMerge,
  useFileDiff,
  useMergeBranch,
  useMergeConflicts,
  useMergeDiff,
} from './api/useMerge';
export { mergeKeys } from './api/queryKeys';

// Components
export { ConflictResolver } from './components/ConflictResolver';
export { FileDiffViewer } from './components/FileDiffViewer';
export { MergeConfirmModal } from './components/MergeConfirmModal';
export { MergePreviewPanel } from './components/MergePreviewPanel';
