/**
 * Root Layout — App shell with sidebar + content area
 *
 * This is the persistent layout wrapping all routes.
 * Sidebar and project tab bar stay mounted; only the content area changes.
 */
import { Outlet } from '@tanstack/react-router';
import { Sidebar } from '@/shared/components/Sidebar';
import { ProjectTabBar } from '@/features/projects/components/ProjectTabBar';

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ProjectTabBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
