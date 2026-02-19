import { useState } from 'react';

import { ChevronDown, ChevronUp, Lightbulb, Pencil, Plus, Tag, Trash2 } from 'lucide-react';

import type { Idea, IdeaCategory } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useCreateIdea, useDeleteIdea, useIdeas, useVoteIdea } from '../api/useIdeas';
import { useIdeaEvents } from '../hooks/useIdeaEvents';

import { IdeaEditForm } from './IdeaEditForm';

const CATEGORY_CONFIG: Record<IdeaCategory, { label: string; colorClass: string }> = {
  feature: { label: 'Feature', colorClass: 'text-primary' },
  improvement: { label: 'Improvement', colorClass: 'text-info' },
  bug: { label: 'Bug', colorClass: 'text-warning' },
  performance: { label: 'Performance', colorClass: 'text-muted-foreground' },
};

const FILTER_OPTIONS: Array<{ value: IdeaCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'feature', label: 'Features' },
  { value: 'improvement', label: 'Improvements' },
  { value: 'bug', label: 'Bugs' },
  { value: 'performance', label: 'Performance' },
];

const CATEGORY_OPTIONS: IdeaCategory[] = ['feature', 'improvement', 'bug', 'performance'];

export function IdeationPage() {
  useIdeaEvents();
  const [activeFilter, setActiveFilter] = useState<IdeaCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<IdeaCategory>('feature');
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);

  const category = activeFilter === 'all' ? undefined : activeFilter;
  const { data: ideas, isLoading } = useIdeas(undefined, undefined, category);
  const createIdea = useCreateIdea();
  const deleteIdea = useDeleteIdea();
  const voteIdea = useVoteIdea();

  function handleCreate(): void {
    if (!formTitle.trim()) return;
    createIdea.mutate({
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
    });
    setFormTitle('');
    setFormDescription('');
    setFormCategory('feature');
    setShowForm(false);
  }

  const items = ideas ?? [];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="text-primary h-6 w-6" />
              <h1 className="text-2xl font-bold">Ideation</h1>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Brainstorm and organize project ideas
            </p>
          </div>
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            type="button"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4" />
            New Idea
          </button>
        </div>

        {/* Create Form */}
        {showForm ? (
          <div className="border-border bg-card mb-6 space-y-3 rounded-lg border p-4">
            <input
              className="bg-muted text-foreground placeholder:text-muted-foreground w-full rounded px-3 py-2 text-sm"
              placeholder="Idea title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
            <textarea
              className="bg-muted text-foreground placeholder:text-muted-foreground w-full rounded px-3 py-2 text-sm"
              placeholder="Description"
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
            <select
              className="bg-muted text-foreground w-full rounded px-3 py-2 text-sm"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as IdeaCategory)}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                type="button"
                onClick={handleCreate}
              >
                Create
              </button>
              <button
                className="bg-muted text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm transition-colors"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                activeFilter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Ideas Grid */}
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center py-12">
            Loading ideas...
          </div>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((idea) => {
              const catConfig = CATEGORY_CONFIG[idea.category];

              return (
                <div
                  key={idea.id}
                  className="border-border bg-card flex flex-col rounded-lg border p-4"
                >
                  {/* Category Badge */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className={cn('h-3.5 w-3.5', catConfig.colorClass)} />
                      <span className={cn('text-xs font-medium', catConfig.colorClass)}>
                        {catConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        aria-label={`Edit ${idea.title}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        type="button"
                        onClick={() => setEditingIdea(idea)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label={`Delete ${idea.title}`}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        type="button"
                        onClick={() => deleteIdea.mutate(idea.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mb-1 text-sm font-medium">{idea.title}</h3>
                  <p className="text-muted-foreground mb-3 flex-1 text-xs leading-relaxed">
                    {idea.description}
                  </p>

                  {/* Votes */}
                  <div className="flex items-center gap-2">
                    <button
                      className="text-muted-foreground hover:text-primary transition-colors"
                      type="button"
                      onClick={() => voteIdea.mutate({ id: idea.id, delta: 1 })}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium">{idea.votes}</span>
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      type="button"
                      onClick={() => voteIdea.mutate({ id: idea.id, delta: -1 })}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <span className="text-muted-foreground bg-muted/50 ml-auto rounded-full px-2 py-0.5 text-xs capitalize">
                      {idea.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <div className="border-border rounded-lg border border-dashed p-12 text-center">
            <Lightbulb className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No ideas in this category</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Try a different filter or add a new idea
            </p>
          </div>
        ) : null}
      </div>

      {/* Edit dialog */}
      <IdeaEditForm idea={editingIdea} onClose={() => setEditingIdea(null)} />
    </div>
  );
}
