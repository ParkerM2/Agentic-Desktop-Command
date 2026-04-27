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

import { Outlet, useRouterState } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { AppUpdateNotification } from '@renderer/shared/components/AppUpdateNotification';
import { AuthNotification } from '@renderer/shared/components/AuthNotification';
import { RouteErrorBoundary } from '@renderer/shared/components/error-boundaries';
import { EventBridge } from '@renderer/shared/components/EventBridge';
import { MutationErrorToast } from '@renderer/shared/components/MutationErrorToast';
import { WebhookNotification } from '@renderer/shared/components/WebhookNotification';
import { WorkspaceInitOverlay } from '@renderer/shared/components/WorkspaceInitOverlay';
import { useLayoutSync } from '@renderer/shared/hooks';
import { useRouteHistoryStore } from '@renderer/shared/stores';

import { AssistantWidget } from '@features/assistant';
import { OnboardingWizard } from '@features/onboarding';
import { IncomingPinDialog } from '@features/peers';
import { useErrorEvents, useSettings } from '@features/settings';
import { WorkflowPermissionModal } from '@features/workflow';

import { ContentAreaContainer } from './ContentAreaContainer';
import { LayoutWrapper } from './LayoutWrapper';
import { TopBar } from './TopBar';

export function RootLayout() {
  const { data: settings, isLoading } = useSettings();
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pushRoute = useRouteHistoryStore((s) => s.pushRoute);

  // Sync layout from IPC settings into Zustand store (theme sync handled by useSettings queryFn)
  const layoutSync = useLayoutSync();

  // Activate error/health event listeners
  useErrorEvents();

  // Track route history for error context
  useEffect(() => {
    pushRoute(pathname);
  }, [pathname, pushRoute]);

  // Show loading state while fetching settings
  if (isLoading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <EventBridge />
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
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
      <EventBridge />
      <div className="min-h-0 flex-1 overflow-hidden">
        <LayoutWrapper>
          <ContentAreaContainer>
            <ContentAreaContainer.ToolBar>
              <TopBar />
            </ContentAreaContainer.ToolBar>
            <ContentAreaContainer.Content>
              <RouteErrorBoundary resetKey={pathname}>
                <Outlet />
              </RouteErrorBoundary>
            </ContentAreaContainer.Content>
          </ContentAreaContainer>
        </LayoutWrapper>
      </div>
      <AppUpdateNotification />
      <AuthNotification />
      <MutationErrorToast />
      <WebhookNotification />
      <AssistantWidget />
      <WorkflowPermissionModal />
      <IncomingPinDialog />
      <WorkspaceInitOverlay phase={layoutSync.phase} projectCount={layoutSync.projectCount} />
    </div>
  );
}
