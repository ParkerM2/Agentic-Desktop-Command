/**
 * Assistant route — /assistant
 */

import { type AnyRoute, createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { DashboardSkeleton } from '../components/route-skeletons';

export function createAssistantRoutes(appLayoutRoute: AnyRoute) {
  const assistantRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.ASSISTANT,
    staticData: { breadcrumbLabel: 'Assistant' },
    pendingComponent: DashboardSkeleton,
    component: lazyRouteComponent(
      () => import('@features/assistant'),
      'AssistantPage',
    ),
  });

  return [assistantRoute] as const;
}
