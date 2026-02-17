import type { ChangeCategory } from '@shared/types';

import { CATEGORY_CONFIG } from './category-config';

export function CategorySection({ category }: { category: ChangeCategory }) {
  const config = CATEGORY_CONFIG[category.type];
  const IconComponent = config.icon;

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: `hsl(var(${config.cssVar}))` }}
      >
        <IconComponent className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
      <ul className="text-foreground space-y-1 pl-6 text-sm">
        {category.items.map((item) => (
          <li key={item} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
