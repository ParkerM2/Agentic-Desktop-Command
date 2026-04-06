/**
 * PageLayout — Compositional page structure primitives
 *
 * Compound component pattern for standardized page layouts.
 * Every feature page composes from these building blocks:
 *
 *   <PageLayout>
 *     <PageHeader>
 *       <PageHeader.Row>
 *         <PageHeader.Title>Tasks</PageHeader.Title>
 *         <PageHeader.Actions><Button>New</Button></PageHeader.Actions>
 *       </PageHeader.Row>
 *       <PageHeader.Tabs defaultValue="list">
 *         <PageHeader.TabList>
 *           <PageHeader.Tab value="list">List</PageHeader.Tab>
 *           <PageHeader.Tab value="board">Board</PageHeader.Tab>
 *         </PageHeader.TabList>
 *         <PageContent>
 *           <PageHeader.TabContent value="list">...</PageHeader.TabContent>
 *         </PageContent>
 *       </PageHeader.Tabs>
 *     </PageHeader>
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
          'border-border flex w-full flex-col border-b',
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
// Renders a tab bar pinned to the bottom of the header

type PageHeaderTabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;

function PageHeaderTabs({ className, ...props }: PageHeaderTabsProps) {
  return (
    <TabsPrimitive.Root
      className={cn('w-full', className)}
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
// For rendering tab panels below the header (inside PageContent)

type PageHeaderTabContentProps = React.ComponentProps<typeof TabsPrimitive.Content>;

function PageHeaderTabContent({ className, ...props }: PageHeaderTabContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn('flex-1 outline-none', className)}
      data-slot="page-header-tab-content"
      {...props}
    />
  );
}

// ─── PageContent ────────────────────────────────────────

type PageContentProps = React.ComponentProps<'div'>;

function PageContent({ className, ...props }: PageContentProps) {
  return (
    <div
      className={cn('w-full flex-1 overflow-auto px-6 py-4', className)}
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
