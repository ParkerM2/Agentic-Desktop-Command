/**
 * IdeaEditForm — Modal dialog for editing an existing idea.
 * Mirrors the ProjectEditDialog pattern: fixed overlay, card modal, escape-to-close.
 */

import { useEffect, useState } from 'react';

import { Loader2, Pencil, X } from 'lucide-react';

import type { Idea, IdeaCategory, IdeaStatus } from '@shared/types';

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ui';

import { useUpdateIdea } from '../api/useIdeas';


const CATEGORY_OPTIONS: readonly IdeaCategory[] = [
  'feature',
  'improvement',
  'bug',
  'performance',
];

const STATUS_OPTIONS: readonly IdeaStatus[] = [
  'new',
  'exploring',
  'accepted',
  'rejected',
  'implemented',
];

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [status, setStatus] = useState<IdeaStatus>('new');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateIdea = useUpdateIdea();

  // Initialize form state when idea changes
  useEffect(() => {
    if (idea !== null) {
      setTitle(idea.title);
      setDescription(idea.description);
      setCategory(idea.category);
      setStatus(idea.status);
      setErrorMessage(null);
    }
  }, [idea]);

  // Escape key closes the dialog
  useEffect(() => {
    if (idea === null) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [idea, onClose]);

  if (idea === null) {
    return null;
  }

  const titleIsEmpty = title.trim().length === 0;

  function handleSave() {
    if (idea === null || titleIsEmpty) {
      return;
    }

    setErrorMessage(null);

    updateIdea.mutate(
      {
        id: idea.id,
        title: title.trim(),
        description: description.trim(),
        category,
        status,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to update idea');
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
      />

      {/* Modal */}
      <div
        aria-labelledby="edit-idea-dialog-title"
        className="bg-card border-border relative z-10 w-full max-w-lg rounded-lg border shadow-xl"
        role="dialog"
      >
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Pencil className="text-primary h-5 w-5" />
            <h2 className="text-foreground text-lg font-semibold" id="edit-idea-dialog-title">
              Edit Idea
            </h2>
          </div>
          <Button
            aria-label="Close dialog"
            className="text-muted-foreground"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
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
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !titleIsEmpty && !updateIdea.isPending) {
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
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-idea-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as IdeaCategory)}
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
              onValueChange={(v) => setStatus(v as IdeaStatus)}
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

          {/* Error message */}
          {errorMessage === null ? null : (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-destructive text-sm">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={titleIsEmpty || updateIdea.isPending}
            type="button"
            onClick={handleSave}
          >
            {updateIdea.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
