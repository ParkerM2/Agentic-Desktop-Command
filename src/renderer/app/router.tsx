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

import { ROUTES, ROUTE_PATTERNS } from '@shared/constants';

// Feature page components
import { AgentDashboard } from '@features/agents';
import { AlertsPage } from '@features/alerts';
import { BriefingPage } from '@features/briefing';
import { ChangelogPage } from '@features/changelog';
import { CommunicationsPage } from '@features/communications';
import { DashboardPage } from '@features/dashboard';
import { FitnessPage } from '@features/fitness';
import { GitHubPage } from '@features/github';
import { IdeationPage } from '@features/ideation';
import { InsightsPage } from '@features/insights';
import { KanbanBoard } from '@features/kanban';
import { MyWorkPage } from '@features/my-work';
import { NotesPage } from '@features/notes';
import { PlannerPage, WeeklyReviewPage } from '@features/planner';
import { ProductivityPage } from '@features/productivity';
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
  path: ROUTES.INDEX,
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTES.DASHBOARD });
  },
});

// ─── Dashboard ──────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.DASHBOARD,
  component: DashboardPage,
});

// ─── My Work ───────────────────────────────────────────────

const myWorkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.MY_WORK,
  component: MyWorkPage,
});

// ─── Alerts ───────────────────────────────────────────────

const alertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.ALERTS,
  component: AlertsPage,
});

// ─── Briefing ──────────────────────────────────────────────

const briefingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.BRIEFING,
  component: BriefingPage,
});

// ─── Communications ──────────────────────────────────────────

const communicationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.COMMUNICATIONS,
  component: CommunicationsPage,
});

// ─── Fitness ─────────────────────────────────────────────────

const fitnessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.FITNESS,
  component: FitnessPage,
});

// ─── Notes ───────────────────────────────────────────────────

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.NOTES,
  component: NotesPage,
});

// ─── Planner ──────────────────────────────────────────────────

const plannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.PLANNER,
  component: PlannerPage,
});

const plannerWeeklyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.PLANNER_WEEKLY,
  component: WeeklyReviewPage,
});

// ─── Productivity ────────────────────────────────────────────

const productivityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.PRODUCTIVITY,
  component: ProductivityPage,
});

// ─── Projects ────────────────────────────────────────────────

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.PROJECTS,
  component: ProjectListPage,
});

// ─── Project Layout (parent for all project views) ──────────

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT,
  beforeLoad: ({ params }) => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTE_PATTERNS.PROJECT_KANBAN, params });
  },
});

// ─── Project Views ──────────────────────────────────────────

const kanbanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_KANBAN,
  component: KanbanBoard,
});

const terminalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_TERMINALS,
  component: TerminalGrid,
});

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_AGENTS,
  component: AgentDashboard,
});

const githubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_GITHUB,
  component: GitHubPage,
});

const roadmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_ROADMAP,
  component: RoadmapPage,
});

const ideationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_IDEATION,
  component: IdeationPage,
});

const changelogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_CHANGELOG,
  component: ChangelogPage,
});

const insightsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_INSIGHTS,
  component: InsightsPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATTERNS.PROJECT_TASKS,
  component: () => (
    <div className="text-muted-foreground flex h-full items-center justify-center">
      Task list view — coming soon
    </div>
  ),
});

// ─── Settings ───────────────────────────────────────────────

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.SETTINGS,
  component: SettingsPage,
});

// ─── Route Tree ─────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  myWorkRoute,
  alertsRoute,
  briefingRoute,
  communicationsRoute,
  fitnessRoute,
  notesRoute,
  plannerRoute,
  plannerWeeklyRoute,
  productivityRoute,
  projectsRoute,
  projectRoute,
  kanbanRoute,
  terminalsRoute,
  agentsRoute,
  githubRoute,
  roadmapRoute,
  ideationRoute,
  changelogRoute,
  insightsRoute,
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
