/**
 * Project query keys factory
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: () => [...projectKeys.lists()] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  subProjects: (projectId: string) =>
    [...projectKeys.all, projectId, 'sub-projects'] as const,
  /** All projects including remote/hub projects */
  allProjects: () => [...projectKeys.all, 'all'] as const,
  /** Claim state for a specific project */
  claim: (projectId: string) => [...projectKeys.all, projectId, 'claim'] as const,
};
