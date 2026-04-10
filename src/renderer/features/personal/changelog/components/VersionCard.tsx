import type { ChangeCategory } from '@shared/types';

import { CategorySection } from './CategorySection';

export function VersionCard({
  entry,
}: {
  entry: { version: string; date: string; categories: ChangeCategory[] };
}) {
  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="border-primary bg-primary/30 absolute top-1 left-0 h-3 w-3 rounded-full border-2" />

      {/* Version header */}
      <div className="mb-3">
        <h3 className="text-foreground text-lg font-semibold">
          {entry.version}{' '}
          <span className="text-muted-foreground text-sm font-normal">-- {entry.date}</span>
        </h3>
      </div>

      {/* Content card */}
      <div className="border-border bg-card space-y-4 rounded-lg border p-4">
        {entry.categories.map((category) => (
          <CategorySection key={category.type} category={category} />
        ))}
      </div>
    </div>
  );
}
