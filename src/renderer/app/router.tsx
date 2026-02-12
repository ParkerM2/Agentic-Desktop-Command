/**
 * Router — TanStack Router configuration
 *
 * All routes defined here. Features are imported directly (lazy loading
 * can be added later with route.lazy()).
 */

import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  redirect,
} from '@tanstack/react-router';

// Feature page components
import { AgentDashboard } from '@features/agents';
import { GitHubPage } from '@features/github';
import { IdeationPage } from '@features/ideation';
import { KanbanBoard } from '@features/kanban';
import { ProjectListPage } from '@features/projects';
import { RoadmapPage } from '@features/roadmap';
import { SettingsPage } from '@features/settings';
import { TerminalGrid } from '@features/terminals';

import { RootLayout } from './layouts/RootLayout';

// ─── Root Route ──────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: RootLayout,
});

// ─── Index Route (redirect to projects) ─────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: '/projects' });
  },
});

// ─── Projects ────────────────────────────────────────────────

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectListPage,
});

// ─── Project Layout (parent for all project views) ──────────

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  beforeLoad: ({ params }) => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: '/projects/$projectId/kanban', params });
  },
});

// ─── Project Views ──────────────────────────────────────────

const kanbanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/kanban',
  component: KanbanBoard,
});

const terminalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/terminals',
  component: TerminalGrid,
});

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/agents',
  component: AgentDashboard,
});

const githubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/github',
  component: GitHubPage,
});

const roadmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/roadmap',
  component: RoadmapPage,
});

const ideationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/ideation',
  component: IdeationPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/tasks',
  component: () => (
    <div className="text-muted-foreground flex h-full items-center justify-center">
      Task list view — coming soon
    </div>
  ),
});

// ─── Settings ───────────────────────────────────────────────

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

// ─── Route Tree ─────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectsRoute,
  projectRoute,
  kanbanRoute,
  terminalsRoute,
  agentsRoute,
  githubRoute,
  roadmapRoute,
  ideationRoute,
  tasksRoute,
  settingsRoute,
]);

// ─── Router Instance ────────────────────────────────────────

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
