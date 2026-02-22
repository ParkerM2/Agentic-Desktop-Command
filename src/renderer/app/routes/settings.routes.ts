/**
 * Settings route group — Settings page
 */

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { SettingsSkeleton } from '../components/route-skeletons';

export function createSettingsRoutes(appLayoutRoute: AnyRoute) {
  const settingsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.SETTINGS,
    staticData: { breadcrumbLabel: 'Settings' },
    pendingComponent: SettingsSkeleton,
    component: lazyRouteComponent(
      () => import('@features/settings'),
      'SettingsPage',
    ),
  });

  const themesRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.THEMES,
    staticData: { breadcrumbLabel: 'Themes' },
    component: lazyRouteComponent(
      () => import('@features/settings'),
      'ThemeEditorPage',
    ),
  });

  return [settingsRoute, themesRoute] as const;
}
