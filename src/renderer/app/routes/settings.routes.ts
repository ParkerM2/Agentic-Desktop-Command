/**
 * Settings route group — Settings page
 */

import { type AnyRoute, createRoute } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { SettingsPage } from '@features/settings';

export function createSettingsRoutes(appLayoutRoute: AnyRoute) {
  const settingsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.SETTINGS,
    component: SettingsPage,
  });

  return [settingsRoute] as const;
}
