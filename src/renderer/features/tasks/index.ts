/**
 * Tasks feature -- public API
 */

// API hooks (only barrel-export hooks with external consumers)
export { useAllTasks } from './api/useTasks';
export { useCreateProgressTask } from './api/useProgressMutations';
export { taskKeys } from './api/queryKeys';

// Events
export { useTaskEvents } from './hooks/useTaskEvents';
export { useAgentEvents } from './hooks/useAgentEvents';
export { useQaEvents } from './hooks/useQaEvents';

// Store
export { useTaskUI } from './store';

// Components
export { CreatePrDialog } from './components/CreatePrDialog';
export { ProgressTaskGrid } from './components/grid/ProgressTaskGrid';
export { TaskFiltersToolbar } from './components/TaskFiltersToolbar';
export { TaskResultView } from './components/detail/TaskResultView';
export { TaskStatusBadge } from './components/TaskStatusBadge';
