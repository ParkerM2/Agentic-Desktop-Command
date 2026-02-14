/**
 * Merge feature — public API
 */

// API hooks
export { useMergeDiff, useMergeConflicts, useMergeBranch, useAbortMerge } from './api/useMerge';
export { mergeKeys } from './api/queryKeys';

// Components
export { MergePreviewPanel } from './components/MergePreviewPanel';
export { ConflictResolver } from './components/ConflictResolver';
export { MergeConfirmModal } from './components/MergeConfirmModal';
