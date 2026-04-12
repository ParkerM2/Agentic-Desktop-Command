/**
 * Personal route group — /personal with optional ?tab= search param
 *
 * The `tab` search param lets old routes redirect here and pre-select a tab.
 * E.g. /notes redirects to /personal?tab=notes.
 */

import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
} from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { GenericPageSkeleton } from '../components/route-skeletons';

type PersonalTab = 'notes' | 'fitness' | 'planner' | 'briefing' | 'alerts' | 'changelog';

export interface PersonalSearch {
  tab?: PersonalTab;
}

export function createPersonalRoutes(appLayoutRoute: AnyRoute) {
  const personalRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTES.PERSONAL,
    staticData: { breadcrumbLabel: 'Personal' },
    pendingComponent: GenericPageSkeleton,
    validateSearch: (search: Record<string, unknown>): PersonalSearch => {
      const validTabs: PersonalTab[] = ['notes', 'fitness', 'planner', 'briefing', 'alerts', 'changelog'];
      const { tab } = search as { tab?: unknown };
      return {
        tab: validTabs.includes(tab as PersonalTab) ? (tab as PersonalTab) : undefined,
      };
    },
    component: lazyRouteComponent(
      () => import('@features/personal'),
      'PersonalPage',
    ),
  });

  return [personalRoute] as const;
}
