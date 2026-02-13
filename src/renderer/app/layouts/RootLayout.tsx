/**
 * RootLayout — App shell
 *
 * Sidebar + ProjectTabBar + route outlet.
 * This is the only layout component — features render inside <Outlet />.
 */

import { Outlet } from '@tanstack/react-router';

import { AuthNotification } from '@renderer/shared/components/AuthNotification';
import { HubNotification } from '@renderer/shared/components/HubNotification';
import { WebhookNotification } from '@renderer/shared/components/WebhookNotification';
import { ThemeHydrator } from '@renderer/shared/stores';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function RootLayout() {
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
      <AuthNotification />
      <HubNotification />
      <WebhookNotification />
    </div>
  );
}
