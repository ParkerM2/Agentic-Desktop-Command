/**
 * Projects feature — public API
 */

// API hooks
export {
  useProjects,
  useAddProject,
  useRemoveProject,
  useSelectDirectory,
} from './api/useProjects';
export { projectKeys } from './api/queryKeys';

// Events
export { useProjectEvents } from './hooks/useProjectEvents';

// Components
export { ProjectListPage } from './components/ProjectListPage';
