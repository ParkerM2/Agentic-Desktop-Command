/**
 * Router — TanStack Router configuration
 *
 * All routes defined here. Features are imported directly (lazy loading
 * can be added later with route.lazy()).
 *
 * Auth routes (/login, /register) are standalone (no sidebar/layout).
 * All other routes are wrapped with AuthGuard, which redirects to /login
 * if not authenticated.
 */

import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  redirect,
} from '@tanstack/react-router';

import { ROUTES, ROUTE_PATTERNS } from '@shared/constants';

import { AgentDashboard } from '@features/agents';
import { AlertsPage } from '@features/alerts';
import { AuthGuard, LoginPage, RegisterPage, useAuthStore } from '@features/auth';
import { BriefingPage } from '@features/briefing';
import { ChangelogPage } from '@features/changelog';
import { CommunicationsPage } from '@features/communications';
import { DashboardPage } from '@features/dashboard';
import { FitnessPage } from '@features/fitness';
import { GitHubPage } from '@features/github';
import { IdeationPage } from '@features/ideation';
import { InsightsPage } from '@features/insights';
import { MyWorkPage } from '@features/my-work';
import { NotesPage } from '@features/notes';
import { PlannerPage, WeeklyReviewPage } from '@features/planner';
import { ProductivityPage } from '@features/productivity';
import { ProjectListPage } from '@features/projects';
import { RoadmapPage } from '@features/roadmap';
import { SettingsPage } from '@features/settings';
import { TaskDataGrid } from '@features/tasks';
import { TerminalGrid } from '@features/terminals';

import { RootLayout } from './layouts/RootLayout';

// ─── Helper: check if user is already authenticated ─────────

function redirectIfAuthenticated() {
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTES.DASHBOARD });
  }
}

// ─── Root Route (bare shell — no layout) ────────────────────

const rootRoute = createRootRoute();

// ─── Auth Routes (standalone, no sidebar) ───────────────────

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.LOGIN,
  beforeLoad: redirectIfAuthenticated,
  component: LoginRouteComponent,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.REGISTER,
  beforeLoad: redirectIfAuthenticated,
  component: RegisterRouteComponent,
});

// ─── Authenticated Layout (AuthGuard + RootLayout) ──────────

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  component: AuthGuard,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  id: 'app',
  component: RootLayout,
});

// ─── Index Route (redirect to dashboard) ────────────────────

const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.INDEX,
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTES.DASHBOARD });
  },
});

// ─── Dashboard ──────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.DASHBOARD,
  component: DashboardPage,
});

// ─── My Work ───────────────────────────────────────────────

const myWorkRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.MY_WORK,
  component: MyWorkPage,
});

// ─── Alerts ───────────────────────────────────────────────

const alertsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.ALERTS,
  component: AlertsPage,
});

// ─── Briefing ──────────────────────────────────────────────

const briefingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.BRIEFING,
  component: BriefingPage,
});

// ─── Communications ──────────────────────────────────────────

const communicationsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.COMMUNICATIONS,
  component: CommunicationsPage,
});

// ─── Fitness ─────────────────────────────────────────────────

const fitnessRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.FITNESS,
  component: FitnessPage,
});

// ─── Notes ───────────────────────────────────────────────────

const notesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.NOTES,
  component: NotesPage,
});

// ─── Planner ──────────────────────────────────────────────────

const plannerRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.PLANNER,
  component: PlannerPage,
});

const plannerWeeklyRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.PLANNER_WEEKLY,
  component: WeeklyReviewPage,
});

// ─── Productivity ────────────────────────────────────────────

const productivityRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.PRODUCTIVITY,
  component: ProductivityPage,
});

// ─── Projects ────────────────────────────────────────────────

const projectsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.PROJECTS,
  component: ProjectListPage,
});

// ─── Project Layout (parent for all project views) ──────────

const projectRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT,
  beforeLoad: ({ params }) => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTE_PATTERNS.PROJECT_TASKS, params });
  },
});

// ─── Project Views ──────────────────────────────────────────

const terminalsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT_TERMINALS,
  component: TerminalGrid,
});

const agentsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT_AGENTS,
  component: AgentDashboard,
});

const githubRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT_GITHUB,
  component: GitHubPage,
});

const roadmapRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT_ROADMAP,
  component: RoadmapPage,
});

const ideationRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT_IDEATION,
  component: IdeationPage,
});

const changelogRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT_CHANGELOG,
  component: ChangelogPage,
});

const insightsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT_INSIGHTS,
  component: InsightsPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTE_PATTERNS.PROJECT_TASKS,
  component: TaskDataGrid,
});

// ─── Settings ───────────────────────────────────────────────

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.SETTINGS,
  component: SettingsPage,
});

// ─── Route Tree ─────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  authLayoutRoute.addChildren([
    appLayoutRoute.addChildren([
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
      terminalsRoute,
      agentsRoute,
      githubRoute,
      roadmapRoute,
      ideationRoute,
      changelogRoute,
      insightsRoute,
      tasksRoute,
      settingsRoute,
    ]),
  ]),
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

// ─── Route Components (wired with navigation callbacks) ─────

function LoginRouteComponent() {
  const navigate = loginRoute.useNavigate();

  return (
    <LoginPage
      onNavigateToRegister={() => {
        void navigate({ to: ROUTES.REGISTER });
      }}
      onSuccess={() => {
        void navigate({ to: ROUTES.DASHBOARD });
      }}
    />
  );
}

function RegisterRouteComponent() {
  const navigate = registerRoute.useNavigate();

  return (
    <RegisterPage
      onNavigateToLogin={() => {
        void navigate({ to: ROUTES.LOGIN });
      }}
      onSuccess={() => {
        void navigate({ to: ROUTES.DASHBOARD });
      }}
    />
  );
}
