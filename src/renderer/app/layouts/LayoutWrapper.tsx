/**
 * LayoutWrapper — Renders the app sidebar + content area
 *
 * Uses the single AppSidebar component which reads the active
 * layout config from the store. No more lazy-loading 16 files.
 */

import { SidebarInset, SidebarProvider } from '@ui/sidebar';

import { AppSidebar } from './sidebar-layouts/AppSidebar';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <SidebarProvider className="h-full">
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
