/**
 * Integrations route group
 */

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
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

  return [integrationsRoute] as const;
}
