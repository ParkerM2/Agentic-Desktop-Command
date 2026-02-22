/**
 * Communication route group — Communications
 */

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { GenericPageSkeleton } from '../components/route-skeletons';

export function createCommunicationRoutes(appLayoutRoute: AnyRoute) {
  const communicationsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.COMMUNICATIONS,
    staticData: { breadcrumbLabel: 'Communications' },
    pendingComponent: GenericPageSkeleton,
    component: lazyRouteComponent(
      () => import('@features/communications'),
      'CommunicationsPage',
    ),
  });

  return [communicationsRoute] as const;
}
