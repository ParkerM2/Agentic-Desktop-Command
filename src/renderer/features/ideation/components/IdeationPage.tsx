import { useState } from 'react';

import { Lightbulb, Plus, Star, Tag } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

type IdeaCategory = 'feature' | 'improvement' | 'bug' | 'performance';
type IdeaPriority = 'high' | 'medium' | 'low';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  priority: IdeaPriority;
}

const MOCK_IDEAS: Idea[] = [
  {
    id: 'idea-1',
    title: 'Dark Mode Scheduling',
    description: 'Auto-switch themes based on time of day or system preference',
    category: 'feature',
    priority: 'high',
  },
  {
    id: 'idea-2',
    title: 'Improve Loading UX',
    description: 'Add skeleton loaders and smooth transitions to all page views',
    category: 'improvement',
    priority: 'medium',
  },
  {
    id: 'idea-3',
    title: 'Terminal Resize Bug',
    description: 'Terminal columns miscalculate on Windows when sidebar is toggled',
    category: 'bug',
    priority: 'high',
  },
  {
    id: 'idea-4',
    title: 'Lazy-load Feature Modules',
    description: 'Code-split feature routes for faster initial load time',
    category: 'performance',
    priority: 'medium',
  },
  {
    id: 'idea-5',
    title: 'Keyboard Shortcuts Panel',
    description: 'Global shortcut overlay showing all available keybindings',
    category: 'feature',
    priority: 'medium',
  },
  {
    id: 'idea-6',
    title: 'Agent Log Export',
    description: 'Export agent conversation logs to markdown or JSON format',
    category: 'feature',
    priority: 'low',
  },
  {
    id: 'idea-7',
    title: 'Reduce IPC Overhead',
    description: 'Batch frequent IPC calls to reduce main process load',
    category: 'performance',
    priority: 'high',
  },
  {
    id: 'idea-8',
    title: 'Inline Task Editing',
    description: 'Edit task titles and descriptions directly in the kanban board',
    category: 'improvement',
    priority: 'low',
  },
];

const CATEGORY_CONFIG: Record<IdeaCategory, { label: string; colorClass: string }> = {
  feature: { label: 'Feature', colorClass: 'text-primary' },
  improvement: { label: 'Improvement', colorClass: 'text-info' },
  bug: { label: 'Bug', colorClass: 'text-warning' },
  performance: { label: 'Performance', colorClass: 'text-muted-foreground' },
};

const PRIORITY_STARS: Record<IdeaPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const FILTER_OPTIONS: Array<{ value: IdeaCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'feature', label: 'Features' },
  { value: 'improvement', label: 'Improvements' },
  { value: 'bug', label: 'Bugs' },
  { value: 'performance', label: 'Performance' },
];

export function IdeationPage() {
  const [activeFilter, setActiveFilter] = useState<IdeaCategory | 'all'>('all');

  const filteredIdeas =
    activeFilter === 'all'
      ? MOCK_IDEAS
      : MOCK_IDEAS.filter((idea) => idea.category === activeFilter);

  return (
    <div className="mx-auto max-w-4xl p-6">
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
          type="button"
          className={cn(
            'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
            'hover:bg-primary/90 transition-colors',
          )}
        >
          <Plus className="h-4 w-4" />
          New Idea
        </button>
      </div>

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
      {filteredIdeas.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredIdeas.map((idea) => {
            const category = CATEGORY_CONFIG[idea.category];
            const stars = PRIORITY_STARS[idea.priority];

            return (
              <div
                key={idea.id}
                className="border-border bg-card flex flex-col rounded-lg border p-4"
              >
                {/* Category Badge */}
                <div className="mb-2 flex items-center gap-1.5">
                  <Tag className={cn('h-3.5 w-3.5', category.colorClass)} />
                  <span className={cn('text-xs font-medium', category.colorClass)}>
                    {category.label}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="mb-1 text-sm font-medium">{idea.title}</h3>
                <p className="text-muted-foreground mb-3 flex-1 text-xs leading-relaxed">
                  {idea.description}
                </p>

                {/* Priority */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Star
                      key={`${idea.id}-star-${String(index)}`}
                      className={cn(
                        'h-3.5 w-3.5',
                        index < stars ? 'fill-primary text-primary' : 'text-muted-foreground/30',
                      )}
                    />
                  ))}
                  <span className="text-muted-foreground ml-1.5 text-xs capitalize">
                    {idea.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <Lightbulb className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No ideas in this category</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Try a different filter or add a new idea
          </p>
        </div>
      )}
    </div>
  );
}
