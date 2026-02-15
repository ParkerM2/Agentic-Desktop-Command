/**
 * RootLayout — App shell
 *
 * Sidebar + ProjectTabBar + route outlet.
 * This is the only layout component — features render inside <Outlet />.
 *
 * If onboarding is not complete, shows the OnboardingWizard instead.
 */

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Outlet } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { AppUpdateNotification } from '@renderer/shared/components/AppUpdateNotification';
import { AuthNotification } from '@renderer/shared/components/AuthNotification';
import { HubNotification } from '@renderer/shared/components/HubNotification';
import { MutationErrorToast } from '@renderer/shared/components/MutationErrorToast';
import { WebhookNotification } from '@renderer/shared/components/WebhookNotification';
import { useIpcEvent } from '@renderer/shared/hooks';
import { ThemeHydrator } from '@renderer/shared/stores';

import { AssistantWidget } from '@features/assistant';
import { OnboardingWizard } from '@features/onboarding';
import { useSettings } from '@features/settings';
import { hubKeys, useHubStatus } from '@features/settings/api/useHub';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function RootLayout() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSettings();
  const { data: hubStatus } = useHubStatus();
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);

  useIpcEvent('event:hub.connectionChanged', () => {
    void queryClient.invalidateQueries({ queryKey: hubKeys.status() });
  });

  // Show loading state while fetching settings
  if (isLoading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <ThemeHydrator />
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
    <div className="flex h-screen overflow-hidden">
      <ThemeHydrator />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        {hubStatus?.status === 'disconnected' || hubStatus?.status === 'error' ? (
          <div className="bg-destructive/10 text-destructive px-4 py-1.5 text-center text-xs">
            Hub disconnected. Some features may be unavailable.
          </div>
        ) : null}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
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
