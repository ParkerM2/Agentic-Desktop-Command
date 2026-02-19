/**
 * IdeaEditForm — Modal dialog for editing an existing idea.
 * Mirrors the ProjectEditDialog pattern: fixed overlay, card modal, escape-to-close.
 */

import { useEffect, useState } from 'react';

import { Loader2, Pencil, X } from 'lucide-react';

import type { Idea, IdeaCategory, IdeaStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

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

const INPUT_BASE_CLASS =
  'border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm';
const INPUT_FOCUS_CLASS = 'focus:ring-ring focus:border-ring focus:outline-none focus:ring-1';
const INPUT_PLACEHOLDER_CLASS = 'placeholder:text-muted-foreground';

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
          <button
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label
              className="text-foreground text-sm font-medium"
              htmlFor="edit-idea-title"
            >
              Title <span className="text-destructive">*</span>
            </label>
            <input
              aria-required="true"
              className={cn(INPUT_BASE_CLASS, INPUT_FOCUS_CLASS, INPUT_PLACEHOLDER_CLASS)}
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
            <label
              className="text-foreground text-sm font-medium"
              htmlFor="edit-idea-description"
            >
              Description
            </label>
            <textarea
              id="edit-idea-description"
              placeholder="Describe the idea..."
              rows={3}
              value={description}
              className={cn(
                INPUT_BASE_CLASS,
                INPUT_FOCUS_CLASS,
                INPUT_PLACEHOLDER_CLASS,
                'resize-none',
              )}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label
              className="text-foreground text-sm font-medium"
              htmlFor="edit-idea-category"
            >
              Category
            </label>
            <select
              className={cn(INPUT_BASE_CLASS, INPUT_FOCUS_CLASS)}
              id="edit-idea-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as IdeaCategory)}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label
              className="text-foreground text-sm font-medium"
              htmlFor="edit-idea-status"
            >
              Status
            </label>
            <select
              className={cn(INPUT_BASE_CLASS, INPUT_FOCUS_CLASS)}
              id="edit-idea-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as IdeaStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
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
          <button
            type="button"
            className={cn(
              'text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm',
              'transition-colors',
            )}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={titleIsEmpty || updateIdea.isPending}
            type="button"
            className={cn(
              'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2',
              'text-sm font-medium transition-opacity hover:opacity-90',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
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
          </button>
        </div>
      </div>
    </div>
  );
}
