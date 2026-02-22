/**
 * Route-group-specific loading skeletons.
 *
 * Used as `pendingComponent` on route groups so that lazy-loaded pages
 * show layout-appropriate placeholders instead of a generic spinner.
 */

import { Skeleton } from '@ui/skeleton';

// ─── Dashboard Skeleton ─────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Page title */}
      <Skeleton className="h-8 w-48" />

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-28" variant="card" />
        <Skeleton className="h-28" variant="card" />
        <Skeleton className="h-28" variant="card" />
      </div>

      {/* Main content area */}
      <Skeleton className="h-64" variant="card" />
    </div>
  );
}

// ─── Project / Table Skeleton ───────────────────────────

export function ProjectSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {/* Toolbar area */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Table header */}
      <div className="flex gap-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Table rows */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={`row-${String(index)}`} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

// ─── Settings Skeleton ──────────────────────────────────

export function SettingsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Page title */}
      <Skeleton className="h-8 w-32" />

      {/* Settings sections */}
      <div className="flex flex-col gap-8">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={`section-${String(index)}`} className="flex flex-col gap-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Generic Page Skeleton ──────────────────────────────

export function GenericPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {/* Page title */}
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80" />

      {/* Content placeholder */}
      <Skeleton className="h-48" variant="card" />
      <Skeleton className="h-32" variant="card" />
    </div>
  );
}
