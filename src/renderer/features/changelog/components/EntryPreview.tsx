import { Edit, Save } from 'lucide-react';

import type { ChangeCategory, ChangelogEntry, ChangeType } from '@shared/types';

import { Button, EmptyState } from '@ui';

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
          <EmptyState
            description="No changes found in the commit history"
            size="sm"
            title="No changes"
          />
        )}
      </div>

      <div className="flex gap-2">
        <Button
          disabled={categories.length === 0 || isSaving}
          type="button"
          onClick={onSave}
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save to Changelog'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
