/**
 * RootLayout — App shell
 *
 * Sidebar + ProjectTabBar + route outlet.
 * This is the only layout component — features render inside <Outlet />.
 */

import { Outlet } from '@tanstack/react-router';

import { ProjectTabBar } from './ProjectTabBar';
import { Sidebar } from './Sidebar';

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ProjectTabBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
