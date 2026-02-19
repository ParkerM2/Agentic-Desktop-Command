import { cn } from '@renderer/shared/lib/utils';

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

interface PageHeaderProps extends React.ComponentProps<'div'> {
  title: string;
  description?: string;
}

function PageHeader({ className, children, description, title, ...props }: PageHeaderProps) {
  const hasActions = children !== undefined && children !== null;

  return (
    <div
      data-slot="page-header"
      className={cn(
        'border-border flex w-full flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <h1 className="text-foreground truncate text-xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {hasActions ? (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

// ─── PageContent ────────────────────────────────────────

type PageContentProps = React.ComponentProps<'div'>;

function PageContent({ className, ...props }: PageContentProps) {
  return (
    <div
      className={cn('w-full flex-1 overflow-auto px-4 py-4 sm:px-6', className)}
      data-slot="page-content"
      {...props}
    />
  );
}

export { PageLayout, PageHeader, PageContent };
export type { PageLayoutProps, PageHeaderProps, PageContentProps };
