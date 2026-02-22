/**
 * Productivity route group — Planner, notes, alerts, productivity
 */

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { GenericPageSkeleton } from '../components/route-skeletons';

export function createProductivityRoutes(appLayoutRoute: AnyRoute) {
  const alertsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.ALERTS,
    staticData: { breadcrumbLabel: 'Alerts' },
    pendingComponent: GenericPageSkeleton,
    component: lazyRouteComponent(
      () => import('@features/alerts'),
      'AlertsPage',
    ),
  });

  const notesRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.NOTES,
    staticData: { breadcrumbLabel: 'Notes' },
    pendingComponent: GenericPageSkeleton,
    component: lazyRouteComponent(
      () => import('@features/notes'),
      'NotesPage',
    ),
  });

  const plannerRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PLANNER,
    staticData: { breadcrumbLabel: 'Planner' },
    pendingComponent: GenericPageSkeleton,
    component: lazyRouteComponent(
      () => import('@features/planner'),
      'PlannerPage',
    ),
  });

  const plannerWeeklyRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PLANNER_WEEKLY,
    staticData: { breadcrumbLabel: 'Weekly Review' },
    pendingComponent: GenericPageSkeleton,
    component: lazyRouteComponent(
      () => import('@features/planner'),
      'WeeklyReviewPage',
    ),
  });

  const productivityRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PRODUCTIVITY,
    staticData: { breadcrumbLabel: 'Productivity' },
    pendingComponent: GenericPageSkeleton,
    component: lazyRouteComponent(
      () => import('@features/productivity'),
      'ProductivityPage',
    ),
  });

  return [
    alertsRoute,
    notesRoute,
    plannerRoute,
    plannerWeeklyRoute,
    productivityRoute,
  ] as const;
}
