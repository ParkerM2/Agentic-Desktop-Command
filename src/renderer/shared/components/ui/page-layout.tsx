/**
 * PageLayout — Compositional page structure primitives
 *
 * Scroll is handled automatically — PageContent always scrolls.
 * PageHeader always stays fixed at the top. No per-page config needed.
 *
 * NON-TABBED pages:
 *   <PageLayout>
 *     <PageHeader>
 *       <PageHeader.Row> ... </PageHeader.Row>
 *     </PageHeader>
 *     <PageContent> ... </PageContent>
 *   </PageLayout>
 *
 * TABBED pages (Tabs wraps header + content so Radix context connects them):
 *   <PageLayout>
 *     <PageHeader.Tabs defaultValue="list">
 *       <PageHeader>
 *         <PageHeader.Row> ... </PageHeader.Row>
 *         <PageHeader.TabList>
 *           <PageHeader.Tab value="list">List</PageHeader.Tab>
 *         </PageHeader.TabList>
 *       </PageHeader>
 *       <PageContent>
 *         <PageHeader.TabContent value="list"> ... </PageHeader.TabContent>
 *       </PageContent>
 *     </PageHeader.Tabs>
 *   </PageLayout>
 */

import type { ReactNode } from 'react';

import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@renderer/shared/lib/utils';

import { PageHeaderContext } from './page-header-context';
import { Heading, Text } from './typography';

// ─── PageLayout ─────────────────────────────────────────

type PageLayoutProps = React.ComponentProps<'div'>;

function PageLayout({ className, ...props }: PageLayoutProps) {
  return (
    <div
      className={cn('flex h-full w-full flex-col', className)}
      data-slot="page-layout"
      {...props}
    />
  );
}

// ─── PageHeader ─────────────────────────────────────────
// Always compact (shrink-0). Never grows. Tab triggers live here.

type PageHeaderProps = React.ComponentProps<'div'>;

function PageHeaderBase({
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <PageHeaderContext.Provider value={{ isComposed: true }}>
      <div
        data-slot="page-header"
        className={cn(
          'border-border flex w-full shrink-0 flex-col border-b',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </PageHeaderContext.Provider>
  );
}

// ─── PageHeader.Row ─────────────────────────────────────
// Groups Title + Actions on the same horizontal line

type PageHeaderRowProps = React.ComponentProps<'div'>;

function PageHeaderRow({ className, ...props }: PageHeaderRowProps) {
  return (
    <div
      data-slot="page-header-row"
      className={cn(
        'flex w-full items-center justify-between gap-4 px-6 py-4',
        className,
      )}
      {...props}
    />
  );
}

// ─── PageHeader.Title ───────────────────────────────────

interface PageHeaderTitleProps extends React.ComponentProps<'div'> {
  children: ReactNode;
  description?: string;
}

function PageHeaderTitle({
  className,
  children,
  description,
  ...props
}: PageHeaderTitleProps) {
  return (
    <div className={cn('min-w-0', className)} data-slot="page-header-title" {...props}>
      <Heading as="h1" className="truncate text-xl">
        {children}
      </Heading>
      {description ? (
        <Text className="mt-1" size="md" variant="muted">
          {description}
        </Text>
      ) : null}
    </div>
  );
}

// ─── PageHeader.Actions ─────────────────────────────────

type PageHeaderActionsProps = React.ComponentProps<'div'>;

function PageHeaderActions({ className, ...props }: PageHeaderActionsProps) {
  return (
    <div
      className={cn('flex shrink-0 items-center gap-2', className)}
      data-slot="page-header-actions"
      {...props}
    />
  );
}

// ─── PageHeader.Tabs ────────────────────────────────────
// Wraps both PageHeader and PageContent so Radix context connects
// TabList (in header) with TabContent (in content area).

type PageHeaderTabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;

function PageHeaderTabs({ className, ...props }: PageHeaderTabsProps) {
  return (
    <TabsPrimitive.Root
      className={cn('flex min-h-0 w-full flex-1 flex-col', className)}
      data-slot="page-header-tabs"
      {...props}
    />
  );
}

// ─── PageHeader.TabList ─────────────────────────────────

type PageHeaderTabListProps = React.ComponentProps<typeof TabsPrimitive.List>;

function PageHeaderTabList({ className, ...props }: PageHeaderTabListProps) {
  return (
    <TabsPrimitive.List
      data-slot="page-header-tab-list"
      className={cn(
        'flex w-full items-center gap-0 px-6',
        className,
      )}
      {...props}
    />
  );
}

// ─── PageHeader.Tab ─────────────────────────────────────

type PageHeaderTabProps = React.ComponentProps<typeof TabsPrimitive.Trigger>;

function PageHeaderTab({ className, ...props }: PageHeaderTabProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="page-header-tab"
      className={cn(
        'text-muted-foreground hover:text-foreground relative inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
        'data-[state=active]:text-foreground data-[state=active]:border-primary',
        className,
      )}
      {...props}
    />
  );
}

// ─── PageHeader.TabContent ──────────────────────────────

type PageHeaderTabContentProps = React.ComponentProps<typeof TabsPrimitive.Content>;

function PageHeaderTabContent({ className, ...props }: PageHeaderTabContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn('flex min-h-0 flex-1 flex-col outline-none', className)}
      data-slot="page-header-tab-content"
      {...props}
    />
  );
}

// ─── PageContent ────────────────────────────────────────
// The scrollable render area. Always flex-1 + overflow-auto.

type PageContentProps = React.ComponentProps<'div'>;

function PageContent({ className, ...props }: PageContentProps) {
  return (
    <div
      className={cn('min-h-0 w-full flex-1 overflow-auto px-6 py-4', className)}
      data-slot="page-content"
      {...props}
    />
  );
}

// ─── Compound Component ─────────────────────────────────

const PageHeader = Object.assign(PageHeaderBase, {
  Actions: PageHeaderActions,
  Row: PageHeaderRow,
  Tab: PageHeaderTab,
  TabContent: PageHeaderTabContent,
  TabList: PageHeaderTabList,
  Tabs: PageHeaderTabs,
  Title: PageHeaderTitle,
});

// ─── Exports ────────────────────────────────────────────

export {
  PageContent,
  PageHeader,
  PageHeaderActions,
  PageHeaderRow,
  PageHeaderTab,
  PageHeaderTabContent,
  PageHeaderTabList,
  PageHeaderTabs,
  PageHeaderTitle,
  PageLayout,
};

export type {
  PageContentProps,
  PageHeaderActionsProps,
  PageHeaderProps,
  PageHeaderRowProps,
  PageHeaderTabContentProps,
  PageHeaderTabListProps,
  PageHeaderTabProps,
  PageHeaderTabsProps,
  PageHeaderTitleProps,
  PageLayoutProps,
};
