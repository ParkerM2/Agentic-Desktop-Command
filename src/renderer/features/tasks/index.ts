/**
 * Tasks feature -- public API
 */

// API hooks (only barrel-export hooks with external consumers)
export { useCreateProgressTask } from './api/useProgressMutations';
export { taskKeys } from './api/queryKeys';

// Events
export { useAgentEvents } from './hooks/useAgentEvents';
export { useQaEvents } from './hooks/useQaEvents';

// Store
export { useTaskUI } from './store';

// Components
export { CreatePrDialog } from './components/CreatePrDialog';
export { ProgressTaskGrid } from './components/grid/ProgressTaskGrid';
