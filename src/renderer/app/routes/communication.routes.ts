/**
 * Communication route group — Communications
 */

import { type AnyRoute, createRoute } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { CommunicationsPage } from '@features/communications';

export function createCommunicationRoutes(appLayoutRoute: AnyRoute) {
  const communicationsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.COMMUNICATIONS,
    component: CommunicationsPage,
  });

  return [communicationsRoute] as const;
}
