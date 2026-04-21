/**
 * EditEntryDialog — Edit an existing changelog entry's date and categories
 */

import { Minus, Plus } from 'lucide-react';

import type { ChangelogEntry, ChangeType } from '@shared/types';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Text,
} from '@ui';

import { useEditEntryDialog } from './useEditEntryDialog';

interface EditEntryDialogProps {
  entry: ChangelogEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEntryDialog({ entry, open, onOpenChange }: EditEntryDialogProps) {
  const {
    version,
    setVersion,
    date,
    setDate,
    categories,
    newItemTexts,
    setNewItemTexts,
    usedTypes,
    hasAvailableTypes,
    isSaveDisabled,
    isPending,
    changeTypes,
    handleAddCategory,
    handleRemoveCategory,
    handleCategoryTypeChange,
    handleAddItem,
    handleRemoveItem,
    handleNewItemKeyDown,
    handleSave,
    handleOpenChange,
  } = useEditEntryDialog(entry, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Changelog Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Version */}
          <div>
            <Label htmlFor="edit-version">Version</Label>
            <Input
              className="mt-1"
              id="edit-version"
              placeholder="v1.0.0"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="edit-date">Date</Label>
            <Input
              className="mt-1"
              id="edit-date"
              placeholder="January 2026"
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <Separator />

          {/* Categories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Categories</Label>
              {hasAvailableTypes ? (
                <Button size="sm" type="button" variant="outline" onClick={handleAddCategory}>
                  <Plus className="h-3 w-3" />
                  Add Category
                </Button>
              ) : null}
            </div>

            {categories.map((category) => (
              <div key={category.type} className="border-border rounded-md border p-3 space-y-3">
                {/* Category header */}
                <div className="flex items-center gap-2">
                  <Select
                    value={category.type}
                    onValueChange={(val) =>
                      handleCategoryTypeChange(category.type, val as ChangeType)
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {changeTypes.map((t) => (
                        <SelectItem
                          key={t}
                          disabled={usedTypes.has(t) && t !== category.type}
                          value={t}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    aria-label={`Remove ${category.type} category`}
                    className="ml-auto"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveCategory(category.type)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Items */}
                <ul className="space-y-1">
                  {category.items.map((item, idx) => (
                    <li key={`${category.type}-${item.slice(0, 30)}`} className="flex items-center gap-2">
                      <Text className="flex-1" size="sm">
                        {item}
                      </Text>
                      <Button
                        aria-label="Remove item"
                        className="h-6 w-6 shrink-0"
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveItem(category.type, idx)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>

                {/* Add item input */}
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Add item..."
                    type="text"
                    value={newItemTexts[category.type] ?? ''}
                    onChange={(e) =>
                      setNewItemTexts((prev) => ({ ...prev, [category.type]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      handleNewItemKeyDown(e, category.type);
                    }}
                  />
                  <Button
                    aria-label="Add item"
                    size="icon"
                    type="button"
                    variant="outline"
                    onClick={() => handleAddItem(category.type)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isSaveDisabled} type="button" onClick={handleSave}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
