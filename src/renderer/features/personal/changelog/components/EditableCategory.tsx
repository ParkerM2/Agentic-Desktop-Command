import { X } from 'lucide-react';

import type { ChangeCategory } from '@shared/types';

import { CATEGORY_CONFIG } from './category-config';

interface EditableCategoryProps {
  category: ChangeCategory;
  onRemoveItem: (index: number) => void;
}

export function EditableCategory({ category, onRemoveItem }: EditableCategoryProps) {
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
      <ul className="space-y-1 pl-6">
        {category.items.map((item, idx) => (
          <li
            key={`${category.type}-${item.slice(0, 20)}`}
            className="group flex items-start gap-2"
          >
            <span className="text-muted-foreground">-</span>
            <span className="flex-1 text-sm">{item}</span>
            <button
              className="text-muted-foreground hover:text-destructive opacity-0 transition-all group-hover:opacity-100"
              type="button"
              onClick={() => onRemoveItem(idx)}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
