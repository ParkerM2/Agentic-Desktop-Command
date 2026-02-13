/**
 * Route path constants.
 *
 * Single source of truth for all navigation paths.
 * Used by router.tsx, Sidebar, ProjectTabBar, and navigation handlers.
 */

/** Top-level routes */
export const ROUTES = {
  INDEX: '/',
  ALERTS: '/alerts',
  ASSISTANT: '/assistant',
  COMMUNICATIONS: '/communications',
  DASHBOARD: '/dashboard',
  FITNESS: '/fitness',
  MY_WORK: '/my-work',
  NOTES: '/notes',
  PLANNER: '/planner',
  PLANNER_WEEKLY: '/planner/weekly',
  PRODUCTIVITY: '/productivity',
  PROJECTS: '/projects',
  SETTINGS: '/settings',
} as const;

/** Project sub-view path segments (appended to /projects/$projectId/) */
export const PROJECT_VIEWS = {
  KANBAN: 'kanban',
  TASKS: 'tasks',
  TERMINALS: 'terminals',
  AGENTS: 'agents',
  ROADMAP: 'roadmap',
  IDEATION: 'ideation',
  GITHUB: 'github',
  CHANGELOG: 'changelog',
  INSIGHTS: 'insights',
} as const;

/** TanStack Router path patterns (use $projectId param syntax) */
export const ROUTE_PATTERNS = {
  PROJECT: '/projects/$projectId',
  PROJECT_KANBAN: '/projects/$projectId/kanban',
  PROJECT_TASKS: '/projects/$projectId/tasks',
  PROJECT_TERMINALS: '/projects/$projectId/terminals',
  PROJECT_AGENTS: '/projects/$projectId/agents',
  PROJECT_ROADMAP: '/projects/$projectId/roadmap',
  PROJECT_IDEATION: '/projects/$projectId/ideation',
  PROJECT_GITHUB: '/projects/$projectId/github',
  PROJECT_CHANGELOG: '/projects/$projectId/changelog',
  PROJECT_INSIGHTS: '/projects/$projectId/insights',
} as const;

/** Build a project view path with a concrete project ID */
export function projectViewPath(projectId: string, view: string): string {
  return `/projects/${projectId}/${view}`;
}
