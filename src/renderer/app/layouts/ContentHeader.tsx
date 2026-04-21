/**
 * ContentHeader — Shared content header bar for all sidebar layouts
 *
 * Renders: [SidebarTrigger] | [Breadcrumbs]
 * Used inside SidebarInset across all 16 layout variants.
 */

import { Separator } from '@radix-ui/react-separator';

import { SidebarTrigger } from '@ui/sidebar';

import { AppBreadcrumbs } from './AppBreadcrumbs';

export function ContentHeader() {
  return (
    <header className="border-border flex h-10 shrink-0 items-center gap-[var(--layout-gap)] border-b px-[var(--layout-gap-lg)]">
      <SidebarTrigger className="-ml-1" />
      <Separator className="bg-border mr-2 h-4 w-px" orientation="vertical" />
      <AppBreadcrumbs />
    </header>
  );
}
