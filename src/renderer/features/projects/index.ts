/**
 * Projects feature — public API
 */

// API hooks
export {
  useProjects,
  useAddProject,
  useRemoveProject,
  useSelectDirectory,
  useUpdateProject,
  useSubProjects,
  useCreateSubProject,
  useDeleteSubProject,
  useSetupExisting,
  useCreateNewProject,
} from './api/useProjects';
export {
  gitKeys,
  useGitStatus,
  useGitBranches,
  useWorktrees,
  useRepoStructure,
  useCreateBranch,
  useCreateWorktree,
  useRemoveWorktree,
  useMergePreview,
  useCheckConflicts,
  useMergeBranch,
  useAbortMerge,
} from './api/useGit';
export { projectKeys } from './api/queryKeys';

// Events
export { useProjectEvents } from './hooks/useProjectEvents';

// Hooks
export { useSetupProgress } from './hooks/useSetupProgress';

// Components
export { ProjectEditDialog } from './components/ProjectEditDialog';
export { ProjectListPage } from './components/ProjectListPage';
export { SetupProgressModal } from './components/SetupProgressModal';
export { WorktreeManager } from './components/WorktreeManager';
export { BranchSelector } from './components/BranchSelector';
export { SubprojectSelector } from './components/SubprojectSelector';
export { ProjectInitWizard } from './components/ProjectInitWizard';
export { CreateProjectWizard } from './components/CreateProjectWizard';
export { RepoTypeSelector } from './components/RepoTypeSelector';
export { SubRepoDetector } from './components/SubRepoDetector';
