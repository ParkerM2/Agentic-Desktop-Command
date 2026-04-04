/**
 * Workflow feature — public API
 */

// API hooks
export {
  useLaunchTask,
  useSessionStatus,
  useStartProgressWatcher,
  useStopProgressWatcher,
  useStopSession,
} from './api/useWorkflow';
export { workflowKeys } from './api/queryKeys';

// Components
export { WorkflowPermissionModal } from './components/WorkflowPermissionModal';
export { WorkflowStatusBar } from './components/WorkflowStatusBar';

// Events
export { useWorkflowEvents } from './hooks/useWorkflowEvents';

// Hooks
export { useWorkflowContext } from './hooks/useWorkflowContext';
export { useWorkflowMilestones } from './hooks/useWorkflowMilestones';
export type { MilestoneEvent } from './hooks/useWorkflowMilestones';
export { useWorkflowStatus } from './hooks/useWorkflowStatus';
export type { WorkflowStatus } from './hooks/useWorkflowStatus';

// Store
export { useWorkflowStore } from './store';
