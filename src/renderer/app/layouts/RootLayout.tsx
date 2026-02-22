/**
 * RootLayout — App shell
 *
 * Uses LayoutWrapper to render the selected sidebar layout variant.
 * The layout selection is stored in the layout store and persisted via settings.
 * Features render inside <Outlet />.
 *
 * If onboarding is not complete, shows the OnboardingWizard instead.
 */

import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { AppUpdateNotification } from '@renderer/shared/components/AppUpdateNotification';
import { AuthNotification } from '@renderer/shared/components/AuthNotification';
import { RouteErrorBoundary } from '@renderer/shared/components/error-boundaries';
import { HubNotification } from '@renderer/shared/components/HubNotification';
import { MutationErrorToast } from '@renderer/shared/components/MutationErrorToast';
import { WebhookNotification } from '@renderer/shared/components/WebhookNotification';
import { useIpcEvent } from '@renderer/shared/hooks';
import { ThemeHydrator, useLayoutStore, useRouteHistoryStore } from '@renderer/shared/stores';

import { AssistantWidget } from '@features/assistant';
import { useErrorEvents } from '@features/health';
import { OnboardingWizard } from '@features/onboarding';
import { useSettings } from '@features/settings';
import { hubKeys, useHubStatus } from '@features/settings/api/useHub';

import { LayoutWrapper } from './LayoutWrapper';
import { TitleBar } from './TitleBar';
import { TopBar } from './TopBar';

export function RootLayout() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSettings();
  const { data: hubStatus } = useHubStatus();
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pushRoute = useRouteHistoryStore((s) => s.pushRoute);
  const sidebarLayout = useLayoutStore((s) => s.sidebarLayout);

  // Activate error/health event listeners
  useErrorEvents();

  // Track route history for error context
  useEffect(() => {
    pushRoute(pathname);
  }, [pathname, pushRoute]);

  useIpcEvent('event:hub.connectionChanged', () => {
    void queryClient.invalidateQueries({ queryKey: hubKeys.status() });
  });

  // Show loading state while fetching settings
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <ThemeHydrator />
        <TitleBar />
        <div className="bg-background flex flex-1 items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Show onboarding wizard if not completed (and not just completed in this session)
  const showOnboarding = settings?.onboardingCompleted === false && !onboardingJustCompleted;

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setOnboardingJustCompleted(true);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ThemeHydrator />
      <TitleBar />
      <div className="min-h-0 flex-1">
        <LayoutWrapper layoutId={sidebarLayout}>
          <TopBar />
          {hubStatus?.status === 'disconnected' || hubStatus?.status === 'error' ? (
            <div className="bg-destructive/10 text-destructive px-4 py-1.5 text-center text-xs">
              Hub disconnected. Some features may be unavailable.
            </div>
          ) : null}
          <main className="flex-1 overflow-auto">
            <RouteErrorBoundary resetKey={pathname}>
              <Outlet />
            </RouteErrorBoundary>
          </main>
        </LayoutWrapper>
      </div>
      <AppUpdateNotification />
      <AuthNotification />
      <HubNotification />
      <MutationErrorToast />
      <WebhookNotification />
      <AssistantWidget />
    </div>
  );
}
