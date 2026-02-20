/**
 * RootLayout — App shell
 *
 * Uses react-resizable-panels for the sidebar + content layout.
 * The sidebar panel is collapsible and the content panel fills remaining space.
 * This is the only layout component — features render inside <Outlet />.
 *
 * If onboarding is not complete, shows the OnboardingWizard instead.
 */

import { useCallback, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from 'react-resizable-panels';

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

import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { TopBar } from './TopBar';

const SIDEBAR_PANEL_ID = 'sidebar';
const CONTENT_PANEL_ID = 'content';
const LAYOUT_STORAGE_ID = 'adc-main-layout';

export function RootLayout() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSettings();
  const { data: hubStatus } = useHubStatus();
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pushRoute = useRouteHistoryStore((s) => s.pushRoute);
  const { sidebarCollapsed, setSidebarCollapsed, setPanelLayout } = useLayoutStore();

  // Panel refs for imperative control
  const sidebarPanelRef = usePanelRef();

  // Persist layout to localStorage
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: LAYOUT_STORAGE_ID,
    storage: localStorage,
  });

  // Sync sidebar collapse state with panel collapse
  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      onLayoutChanged(layout);
      setPanelLayout(layout);

      // Sync collapsed state using the panel's imperative API
      const collapsed = sidebarPanelRef.current?.isCollapsed() ?? false;
      setSidebarCollapsed(collapsed);
    },
    [onLayoutChanged, setPanelLayout, setSidebarCollapsed, sidebarPanelRef],
  );

  // When sidebarCollapsed changes from external toggle, sync to panel
  useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    if (sidebarCollapsed && !panel.isCollapsed()) {
      panel.collapse();
    } else if (!sidebarCollapsed && panel.isCollapsed()) {
      panel.expand();
    }
  }, [sidebarCollapsed, sidebarPanelRef]);

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
      <Group
        className="min-h-0 flex-1"
        defaultLayout={defaultLayout}
        id={LAYOUT_STORAGE_ID}
        orientation="horizontal"
        onLayoutChanged={handleLayoutChanged}
      >
        <Panel
          collapsible
          collapsedSize="56px"
          defaultSize="208px"
          id={SIDEBAR_PANEL_ID}
          maxSize="300px"
          minSize="56px"
          panelRef={sidebarPanelRef}
        >
          <Sidebar />
        </Panel>
        <Separator className="bg-border hover:bg-primary/20 active:bg-primary/40 w-px transition-colors data-[separator]:hover:w-1" />
        <Panel id={CONTENT_PANEL_ID} minSize="30%">
          <div className="flex h-full flex-col overflow-hidden">
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
          </div>
        </Panel>
      </Group>
      <AppUpdateNotification />
      <AuthNotification />
      <HubNotification />
      <MutationErrorToast />
      <WebhookNotification />
      <AssistantWidget />
    </div>
  );
}
