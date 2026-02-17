import { Edit, Save } from 'lucide-react';

import type { ChangeCategory, ChangelogEntry, ChangeType } from '@shared/types';

import { EditableCategory } from './EditableCategory';

interface EntryPreviewProps {
  entry: ChangelogEntry;
  categories: ChangeCategory[];
  isSaving: boolean;
  onRemoveItem: (categoryType: ChangeType, index: number) => void;
  onSave: () => void;
  onBack: () => void;
}

export function EntryPreview({
  entry,
  categories,
  isSaving,
  onRemoveItem,
  onSave,
  onBack,
}: EntryPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Edit className="h-4 w-4" />
          <span>Preview and edit before saving</span>
        </div>
      </div>

      <div className="border-border bg-muted/50 rounded-lg border p-4">
        <div className="mb-3">
          <span className="text-lg font-semibold">{entry.version}</span>
          <span className="text-muted-foreground ml-2 text-sm">-- {entry.date}</span>
        </div>

        {categories.length > 0 ? (
          <div className="space-y-4">
            {categories.map((category) => (
              <EditableCategory
                key={category.type}
                category={category}
                onRemoveItem={(idx) => onRemoveItem(category.type, idx)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No changes found in the commit history</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          disabled={categories.length === 0 || isSaving}
          type="button"
          onClick={onSave}
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save to Changelog'}
        </button>
        <button
          className="bg-muted text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm transition-colors"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
      </div>
    </div>
  );
}
