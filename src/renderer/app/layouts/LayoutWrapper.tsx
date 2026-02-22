/**
 * LayoutWrapper — Switches between 16 sidebar layout variants
 *
 * Reads the selected sidebarLayout from the layout store and
 * lazy-loads the corresponding SidebarLayoutXX component.
 * Wraps children in SidebarProvider + SidebarInset.
 */

import { Suspense, lazy } from 'react';

import { Loader2 } from 'lucide-react';

import type { SidebarLayoutId } from '@shared/types/layout';


import { SidebarInset, SidebarProvider } from '@ui/sidebar';

import { ContentHeader } from './ContentHeader';

const LAYOUT_MAP: Record<SidebarLayoutId, React.LazyExoticComponent<React.ComponentType>> = {
  'sidebar-01': lazy(() =>
    import('./sidebar-layouts/SidebarLayout01').then((m) => ({ default: m.SidebarLayout01 })),
  ),
  'sidebar-02': lazy(() =>
    import('./sidebar-layouts/SidebarLayout02').then((m) => ({ default: m.SidebarLayout02 })),
  ),
  'sidebar-03': lazy(() =>
    import('./sidebar-layouts/SidebarLayout03').then((m) => ({ default: m.SidebarLayout03 })),
  ),
  'sidebar-04': lazy(() =>
    import('./sidebar-layouts/SidebarLayout04').then((m) => ({ default: m.SidebarLayout04 })),
  ),
  'sidebar-05': lazy(() =>
    import('./sidebar-layouts/SidebarLayout05').then((m) => ({ default: m.SidebarLayout05 })),
  ),
  'sidebar-06': lazy(() =>
    import('./sidebar-layouts/SidebarLayout06').then((m) => ({ default: m.SidebarLayout06 })),
  ),
  'sidebar-07': lazy(() =>
    import('./sidebar-layouts/SidebarLayout07').then((m) => ({ default: m.SidebarLayout07 })),
  ),
  'sidebar-08': lazy(() =>
    import('./sidebar-layouts/SidebarLayout08').then((m) => ({ default: m.SidebarLayout08 })),
  ),
  'sidebar-09': lazy(() =>
    import('./sidebar-layouts/SidebarLayout09').then((m) => ({ default: m.SidebarLayout09 })),
  ),
  'sidebar-10': lazy(() =>
    import('./sidebar-layouts/SidebarLayout10').then((m) => ({ default: m.SidebarLayout10 })),
  ),
  'sidebar-11': lazy(() =>
    import('./sidebar-layouts/SidebarLayout11').then((m) => ({ default: m.SidebarLayout11 })),
  ),
  'sidebar-12': lazy(() =>
    import('./sidebar-layouts/SidebarLayout12').then((m) => ({ default: m.SidebarLayout12 })),
  ),
  'sidebar-13': lazy(() =>
    import('./sidebar-layouts/SidebarLayout13').then((m) => ({ default: m.SidebarLayout13 })),
  ),
  'sidebar-14': lazy(() =>
    import('./sidebar-layouts/SidebarLayout14').then((m) => ({ default: m.SidebarLayout14 })),
  ),
  'sidebar-15': lazy(() =>
    import('./sidebar-layouts/SidebarLayout15').then((m) => ({ default: m.SidebarLayout15 })),
  ),
  'sidebar-16': lazy(() =>
    import('./sidebar-layouts/SidebarLayout16').then((m) => ({ default: m.SidebarLayout16 })),
  ),
};

function SidebarSkeleton() {
  return (
    <div className="bg-sidebar flex h-full w-[16rem] items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
}

interface LayoutWrapperProps {
  children: React.ReactNode;
  layoutId: SidebarLayoutId;
}

export function LayoutWrapper({ children, layoutId }: LayoutWrapperProps) {
  const Layout = LAYOUT_MAP[layoutId];

  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <Layout />
      </Suspense>
      <SidebarInset>
        <ContentHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
