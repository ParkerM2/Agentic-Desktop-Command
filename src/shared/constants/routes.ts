/**
 * Route path constants.
 *
 * Single source of truth for all navigation paths.
 * Used by router.tsx, Sidebar, ProjectTabBar, and navigation handlers.
 */

/** Top-level routes */
export const ROUTES = {
  INDEX: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HUB_SETUP: '/hub-setup',
  ASSISTANT: '/assistant',
  INTEGRATIONS: '/integrations',
  DASHBOARD: '/dashboard',
  MY_WORK: '/my-work',
  PERSONAL: '/personal',
  PROJECTS: '/projects',
  SETTINGS: '/settings',
  AGENTS: '/agents',
  THEMES: '/settings/themes',
  // Legacy routes — kept for redirect route definitions
  ALERTS: '/alerts',
  BRIEFING: '/briefing',
  COMMUNICATIONS: '/communications',
  FITNESS: '/fitness',
  NOTES: '/notes',
  PLANNER: '/planner',
  PLANNER_WEEKLY: '/planner/weekly',
  PRODUCTIVITY: '/productivity',
} as const;

/** Project sub-view path segments (appended to /projects/$projectId/) */
export const PROJECT_VIEWS = {
  TASKS: 'tasks',
  TERMINALS: 'terminals',
  AGENTS: 'agents',
  PLANNING: 'planning',
  GIT: 'git',
  GITHUB: 'github',
  TOOLS: 'tools',
  WORKFLOW: 'workflow',
  VISUALIZATION: 'visualization',
} as const;

/** TanStack Router path patterns (use $projectId param syntax) */
export const ROUTE_PATTERNS = {
  PROJECT: '/projects/$projectId',
  PROJECT_TASKS: '/projects/$projectId/tasks',
  PROJECT_TERMINALS: '/projects/$projectId/terminals',
  PROJECT_AGENTS: '/projects/$projectId/agents',
  PROJECT_PLANNING: '/projects/$projectId/planning',
  PROJECT_GIT: '/projects/$projectId/git',
  PROJECT_GITHUB: '/projects/$projectId/github',
  PROJECT_TOOLS: '/projects/$projectId/tools',
  PROJECT_WORKFLOW: '/projects/$projectId/workflow',
  PROJECT_VISUALIZATION: '/projects/$projectId/visualization',
  // Legacy patterns kept for redirect routes
  PROJECT_ROADMAP: '/projects/$projectId/roadmap',
  PROJECT_IDEATION: '/projects/$projectId/ideation',
  PROJECT_CHANGELOG: '/projects/$projectId/changelog',
  PROJECT_INSIGHTS: '/projects/$projectId/insights',
} as const;

/** Build a project view path with a concrete project ID */
export function projectViewPath(projectId: string, view: string): string {
  return `/projects/${projectId}/${view}`;
}
