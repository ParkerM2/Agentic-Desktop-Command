/**
 * Integrations route group — /integrations + legacy redirects
 */

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { GenericPageSkeleton } from '../components/route-skeletons';

export function createIntegrationsRoutes(appLayoutRoute: AnyRoute) {
  const integrationsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.INTEGRATIONS,
    staticData: { breadcrumbLabel: 'Integrations' },
    pendingComponent: GenericPageSkeleton,
    component: lazyRouteComponent(
      () => import('@features/integrations'),
      'IntegrationsPage',
    ),
  });

  // Legacy /communications → /integrations (slack tab)
  const communicationsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.COMMUNICATIONS,
    beforeLoad: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
      throw redirect({ to: ROUTES.INTEGRATIONS });
    },
  });

  return [integrationsRoute, communicationsRoute] as const;
}
