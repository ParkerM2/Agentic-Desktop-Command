/**
 * RootLayout — App shell
 *
 * Sidebar + ProjectTabBar + route outlet.
 * This is the only layout component — features render inside <Outlet />.
 *
 * If onboarding is not complete, shows the OnboardingWizard instead.
 */

import { useState } from 'react';

import { Outlet } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { AppUpdateNotification } from '@renderer/shared/components/AppUpdateNotification';
import { AuthNotification } from '@renderer/shared/components/AuthNotification';
import { HubNotification } from '@renderer/shared/components/HubNotification';
import { WebhookNotification } from '@renderer/shared/components/WebhookNotification';
import { ThemeHydrator } from '@renderer/shared/stores';

import { OnboardingWizard } from '@features/onboarding';
import { useSettings } from '@features/settings';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function RootLayout() {
  const { data: settings, isLoading } = useSettings();
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);

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
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <AppUpdateNotification />
      <AuthNotification />
      <HubNotification />
      <WebhookNotification />
    </div>
  );
}
