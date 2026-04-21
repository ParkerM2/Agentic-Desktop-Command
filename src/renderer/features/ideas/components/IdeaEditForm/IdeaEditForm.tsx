/**
 * IdeaEditForm — Modal dialog for editing an existing idea.
 */

import { Pencil, X } from 'lucide-react';

import type { Idea, IdeaCategory, IdeaStatus } from '@shared/types';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InlineAlert,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@ui';

import { useIdeaEditForm } from './useIdeaEditForm';

const CATEGORY_OPTIONS: readonly IdeaCategory[] = ['feature', 'improvement', 'bug', 'performance'];
const STATUS_OPTIONS: readonly IdeaStatus[] = ['new', 'exploring', 'accepted', 'rejected', 'implemented'];
const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  feature: 'Feature',
  improvement: 'Improvement',
  bug: 'Bug',
  performance: 'Performance',
};
const STATUS_LABELS: Record<IdeaStatus, string> = {
  new: 'New',
  exploring: 'Exploring',
  accepted: 'Accepted',
  rejected: 'Rejected',
  implemented: 'Implemented',
};

interface IdeaEditFormProps {
  idea: Idea | null;
  onClose: () => void;
}

export function IdeaEditForm({ idea, onClose }: IdeaEditFormProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    status,
    setStatus,
    tags,
    tagInput,
    setTagInput,
    errorMessage,
    tagInputRef,
    titleIsEmpty,
    isSaving,
    addTag,
    removeTag,
    handleTagKeyDown,
    handleSave,
  } = useIdeaEditForm(idea, onClose);

  return (
    <Dialog open={idea !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Pencil className="text-primary h-5 w-5" />
            Edit Idea
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-idea-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              aria-required="true"
              id="edit-idea-title"
              placeholder="Idea title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !titleIsEmpty && !isSaving) {
                  handleSave();
                }
              }}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-idea-description">Description</Label>
            <Textarea
              id="edit-idea-description"
              placeholder="Describe the idea..."
              resize="none"
              rows={3}
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-idea-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => { setCategory(v as IdeaCategory); }}
            >
              <SelectTrigger id="edit-idea-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-idea-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => { setStatus(v as IdeaStatus); }}
            >
              <SelectTrigger id="edit-idea-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-idea-tags">Tags</Label>
            <div
              aria-label="Tag chips"
              className="border-input bg-background focus-within:ring-ring flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border px-3 py-1.5 focus-within:ring-2"
              role="group"
            >
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-0.5">
                  <Badge variant="secondary">{tag}</Badge>
                  <Button
                    aria-label={`Remove tag ${tag}`}
                    className="text-muted-foreground hover:text-foreground ml-0.5 h-auto rounded-full p-0.5"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </span>
              ))}
              <Input
                ref={tagInputRef}
                aria-label="Add a tag"
                className="min-w-20 flex-1 border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-0"
                id="edit-idea-tags"
                placeholder={tags.length > 0 ? '' : 'Add tags (Enter or comma to confirm)'}
                type="text"
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); }}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (tagInput.trim().length > 0) addTag(tagInput);
                }}
              />
            </div>
          </div>

          {errorMessage === null ? null : (
            <InlineAlert variant="error">
              {errorMessage}
            </InlineAlert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={titleIsEmpty || isSaving}
            type="button"
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <Spinner className="h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
