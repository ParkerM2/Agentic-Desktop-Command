/**
 * Productivity route group — legacy redirects to /personal tabs
 *
 * All old individual routes now redirect to the consolidated /personal page
 * with the appropriate tab selected via the `tab` search param.
 */

import { type AnyRoute, createRoute, redirect } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

export function createProductivityRoutes(appLayoutRoute: AnyRoute) {
  const alertsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.ALERTS,
    beforeLoad: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.PERSONAL, search: { tab: 'alerts' } });
    },
  });

  const notesRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.NOTES,
    beforeLoad: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.PERSONAL, search: { tab: 'notes' } });
    },
  });

  const plannerRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PLANNER,
    beforeLoad: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.PERSONAL, search: { tab: 'planner' } });
    },
  });

  const plannerWeeklyRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PLANNER_WEEKLY,
    beforeLoad: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.PERSONAL, search: { tab: 'planner' } });
    },
  });

  const productivityRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PRODUCTIVITY,
    beforeLoad: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.PERSONAL });
    },
  });

  return [
    alertsRoute,
    notesRoute,
    plannerRoute,
    plannerWeeklyRoute,
    productivityRoute,
  ] as const;
}
