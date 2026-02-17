/**
 * Dashboard route group — Dashboard, my-work
 */

import { type AnyRoute, createRoute } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { DashboardPage } from '@features/dashboard';
import { MyWorkPage } from '@features/my-work';

export function createDashboardRoutes(appLayoutRoute: AnyRoute) {
  const dashboardRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.DASHBOARD,
    component: DashboardPage,
  });

  const myWorkRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.MY_WORK,
    component: MyWorkPage,
  });

  return [dashboardRoute, myWorkRoute] as const;
}
