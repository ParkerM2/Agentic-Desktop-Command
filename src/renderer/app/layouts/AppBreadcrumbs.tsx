/**
 * AppBreadcrumbs — Breadcrumb trail from TanStack Router matches
 *
 * Reads staticData.breadcrumbLabel from route matches to build
 * a navigation breadcrumb trail. Used in ContentHeader.
 */

import { Link, useMatches } from '@tanstack/react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@ui/breadcrumb';

export function AppBreadcrumbs() {
  const matches = useMatches();
  const crumbs = matches.filter(
    (m) => typeof m.staticData.breadcrumbLabel === 'string' && m.staticData.breadcrumbLabel.length > 0,
  );

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((match, i) => {
          const label = match.staticData.breadcrumbLabel ?? '';
          const isLast = i === crumbs.length - 1;

          return (
            <BreadcrumbItem key={match.id}>
              {isLast ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={match.pathname}>{label}</Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
