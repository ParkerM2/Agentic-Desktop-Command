/**
 * Agents route group — top-level cross-project agent activity view
 */

import { type AnyRoute, createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

export function createAgentsRoutes(appLayoutRoute: AnyRoute) {
  const agentsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.AGENTS,
    staticData: { breadcrumbLabel: 'Agents' },
    component: lazyRouteComponent(
      () => import('@features/agent-dashboard'),
      'AgentDashboardPage',
    ),
  });

  return [agentsRoute] as const;
}
