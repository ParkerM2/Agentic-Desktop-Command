/**
 * Personal route group — Notes, fitness, planner, briefing, alerts, changelog
 */

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { GenericPageSkeleton } from '../components/route-skeletons';

export function createPersonalRoutes(appLayoutRoute: AnyRoute) {
  const personalRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PERSONAL,
    staticData: { breadcrumbLabel: 'Personal' },
    pendingComponent: GenericPageSkeleton,
    component: lazyRouteComponent(
      () => import('@features/personal'),
      'PersonalPage',
    ),
  });

  return [personalRoute] as const;
}
