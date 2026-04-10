/**
 * Misc route group — legacy redirects to /personal tabs
 *
 * /briefing and /fitness were individual pages; now they are tabs under /personal.
 */

import { type AnyRoute, createRoute, redirect } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

export function createMiscRoutes(appLayoutRoute: AnyRoute) {
  const briefingRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.BRIEFING,
    beforeLoad: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.PERSONAL, search: { tab: 'briefing' } });
    },
  });

  const fitnessRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.FITNESS,
    beforeLoad: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.PERSONAL, search: { tab: 'fitness' } });
    },
  });

  return [briefingRoute, fitnessRoute] as const;
}
