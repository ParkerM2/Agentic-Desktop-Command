/**
 * Router — TanStack Router configuration
 *
 * Route definitions are split into group files under ./routes/.
 * This file creates the root/layout routes, assembles the tree, and exports AppRouter.
 */

import {
  createHashHistory,
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  redirect,
} from '@tanstack/react-router';
import { AlertTriangle, RotateCcw } from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { RootErrorBoundary } from '@renderer/shared/components/error-boundaries';

import { AuthGuard } from '@features/auth';

import { Spinner } from '@ui/spinner';

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

import type { ErrorComponentProps } from '@tanstack/react-router';

// ─── Default Pending / Error Components ──────────────────────

function DefaultPendingComponent() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner aria-label="Loading page" size="lg" />
    </div>
  );
}

function DefaultErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="border-border bg-card flex max-w-md flex-col items-center gap-4 rounded-lg border p-8 text-center shadow-sm">
        <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
          <AlertTriangle aria-hidden="true" className="text-destructive h-6 w-6" />
        </div>
        <h2 className="text-foreground text-lg font-semibold">
          Failed to load page
        </h2>
        <p className="text-muted-foreground text-sm">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          type="button"
          onClick={reset}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}

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

const hashHistory = createHashHistory();

const router = createRouter({
  history: hashHistory,
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: DefaultPendingComponent,
  defaultErrorComponent: DefaultErrorComponent,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface StaticDataRouteOption {
    breadcrumbLabel?: string;
  }
}

export function AppRouter() {
  return (
    <RootErrorBoundary>
      <RouterProvider router={router} />
    </RootErrorBoundary>
  );
}
