/**
 * Misc route group — Fitness, briefing
 */

import { type AnyRoute, createRoute } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { BriefingPage } from '@features/briefing';
import { FitnessPage } from '@features/fitness';

export function createMiscRoutes(appLayoutRoute: AnyRoute) {
  const briefingRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.BRIEFING,
    component: BriefingPage,
  });

  const fitnessRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.FITNESS,
    component: FitnessPage,
  });

  return [briefingRoute, fitnessRoute] as const;
}
