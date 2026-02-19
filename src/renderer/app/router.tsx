/**
 * Router — TanStack Router configuration
 *
 * Route definitions are split into group files under ./routes/.
 * This file creates the root/layout routes, assembles the tree, and exports AppRouter.
 */

import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  redirect,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { RootErrorBoundary } from '@renderer/shared/components/error-boundaries';

import { AuthGuard } from '@features/auth';

import { RootLayout } from './layouts/RootLayout';
import {
  createAuthRoutes,
  createCommunicationRoutes,
  createDashboardRoutes,
  createMiscRoutes,
  createProductivityRoutes,
  createProjectRoutes,
  createSettingsRoutes,
} from './routes';

// ─── Root + Layout Routes ────────────────────────────────────

const rootRoute = createRootRoute();

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

const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: ROUTES.INDEX,
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
    throw redirect({ to: ROUTES.DASHBOARD });
  },
});

// ─── Route Groups ────────────────────────────────────────────

const { loginRoute, registerRoute, hubSetupRoute } = createAuthRoutes(rootRoute);

const dashboardRoutes = createDashboardRoutes(appLayoutRoute);
const projectRoutes = createProjectRoutes(appLayoutRoute);
const productivityRoutes = createProductivityRoutes(appLayoutRoute);
const communicationRoutes = createCommunicationRoutes(appLayoutRoute);
const settingsRoutes = createSettingsRoutes(appLayoutRoute);
const miscRoutes = createMiscRoutes(appLayoutRoute);

// ─── Route Tree ──────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  hubSetupRoute,
  authLayoutRoute.addChildren([
    appLayoutRoute.addChildren([
      indexRoute,
      ...dashboardRoutes,
      ...projectRoutes,
      ...productivityRoutes,
      ...communicationRoutes,
      ...settingsRoutes,
      ...miscRoutes,
    ]),
  ]),
]);

// ─── Router Instance ─────────────────────────────────────────

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return (
    <RootErrorBoundary>
      <RouterProvider router={router} />
    </RootErrorBoundary>
  );
}
