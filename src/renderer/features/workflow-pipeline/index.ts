/**
 * Workflow Pipeline feature — public API
 */

// API hooks
export { useUpdateTaskDescription, useUpdateTaskPlan } from './api/useUpdateTask';
export { workflowPipelineKeys } from './api/queryKeys';

// Events
export { useWorkflowPipelineEvents } from './hooks/useWorkflowPipelineEvents';

// Components
export { PipelineConnector } from './components/PipelineConnector';
export { PipelineDiagram } from './components/PipelineDiagram';
export { PipelineStepNode } from './components/PipelineStepNode';
export type { StepState } from './components/PipelineStepNode';
export { TaskSelector } from './components/TaskSelector';
export { WorkflowPipelinePage } from './components/WorkflowPipelinePage';

// Store
export { useWorkflowPipelineStore } from './store';
