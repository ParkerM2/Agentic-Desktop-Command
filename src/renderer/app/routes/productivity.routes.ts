/**
 * Productivity route group — Planner, notes, alerts, productivity
 */

import { type AnyRoute, createRoute } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { AlertsPage } from '@features/alerts';
import { NotesPage } from '@features/notes';
import { PlannerPage, WeeklyReviewPage } from '@features/planner';
import { ProductivityPage } from '@features/productivity';

export function createProductivityRoutes(appLayoutRoute: AnyRoute) {
  const alertsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.ALERTS,
    component: AlertsPage,
  });

  const notesRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.NOTES,
    component: NotesPage,
  });

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

  const productivityRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PRODUCTIVITY,
    component: ProductivityPage,
  });

  return [
    alertsRoute,
    notesRoute,
    plannerRoute,
    plannerWeeklyRoute,
    productivityRoute,
  ] as const;
}
