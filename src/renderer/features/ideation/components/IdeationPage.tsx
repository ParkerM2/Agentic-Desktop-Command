import { useState } from 'react';

import { ChevronDown, ChevronUp, Lightbulb, Pencil, Plus, Sparkles, Tag, Trash2 } from 'lucide-react';

import type { Idea, IdeaCategory } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';
import { useAssistantWidgetStore, useLayoutStore } from '@renderer/shared/stores';

import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@ui';

import { useSendCommand } from '@features/assistant';


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

const DEFAULT_GENERATE_PROMPT =
  'Suggest 3 new feature ideas for my developer productivity project. For each, call the create_idea tool with a clear title and description.';

export function IdeationPage() {
  useIdeaEvents();
  const [activeFilter, setActiveFilter] = useState<IdeaCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<IdeaCategory>('feature');
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState(DEFAULT_GENERATE_PROMPT);

  const category = activeFilter === 'all' ? undefined : activeFilter;
  const { data: ideas, isLoading } = useIdeas(undefined, undefined, category);
  const createIdea = useCreateIdea();
  const deleteIdea = useDeleteIdea();
  const voteIdea = useVoteIdea();
  const sendCommand = useSendCommand();
  const openWidget = useAssistantWidgetStore((s) => s.open);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);

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

  function handleGenerate(): void {
    if (!generatePrompt.trim() || sendCommand.isPending) return;
    openWidget();
    sendCommand.mutate({
      input: generatePrompt.trim(),
      context: { activeView: 'ideation', activeProjectId: activeProjectId ?? undefined },
    });
    setShowGenerate(false);
    setGeneratePrompt(DEFAULT_GENERATE_PROMPT);
  }

  const items = ideas ?? [];

  return (
    <div className="space-y-6 p-6">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowGenerate(!showGenerate);
            setShowForm(false);
          }}
        >
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
        <Button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setShowGenerate(false);
          }}
        >
          <Plus className="h-4 w-4" />
          New Idea
        </Button>
      </div>
        {/* Generate with AI Panel */}
        {showGenerate ? (
          <Card className="mb-6">
            <CardContent className="space-y-3 p-4">
              <p className="text-muted-foreground text-sm">
                Describe what ideas you want the assistant to generate. It will create them directly in your ideation board.
              </p>
              <Textarea
                resize="none"
                rows={3}
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) handleGenerate();
                }}
              />
              <div className="flex gap-2">
                <Button
                  disabled={sendCommand.isPending || !generatePrompt.trim()}
                  type="button"
                  onClick={handleGenerate}
                >
                  {sendCommand.isPending ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGenerate(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Create Form */}
        {showForm ? (
          <Card className="mb-6">
            <CardContent className="space-y-3 p-4">
              <Input
                placeholder="Idea title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description"
                resize="none"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
              <Select
                value={formCategory}
                onValueChange={(v) => setFormCategory(v as IdeaCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button type="button" onClick={handleCreate}>
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              className="rounded-full"
              size="sm"
              type="button"
              variant={activeFilter === option.value ? 'primary' : 'ghost'}
              onClick={() => setActiveFilter(option.value)}
            >
              {option.label}
            </Button>
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
                <Card key={idea.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-4">
                    {/* Category Badge */}
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Tag className={cn('h-3.5 w-3.5', catConfig.colorClass)} />
                        <span className={cn('text-xs font-medium', catConfig.colorClass)}>
                          {catConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          aria-label={`Edit ${idea.title}`}
                          className="text-muted-foreground hover:text-primary h-6 w-6 p-1"
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() => setEditingIdea(idea)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          aria-label={`Delete ${idea.title}`}
                          className="text-muted-foreground hover:text-destructive h-6 w-6 p-1"
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() => deleteIdea.mutate(idea.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="mb-1 text-sm font-medium">{idea.title}</h3>
                    <p className="text-muted-foreground mb-3 flex-1 text-xs leading-relaxed">
                      {idea.description}
                    </p>

                    {/* Votes */}
                    <div className="flex items-center gap-2">
                      <Button
                        className="text-muted-foreground hover:text-primary h-6 w-6 p-1"
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={() => voteIdea.mutate({ id: idea.id, delta: 1 })}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">{idea.votes}</span>
                      <Button
                        className="text-muted-foreground hover:text-destructive h-6 w-6 p-1"
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={() => voteIdea.mutate({ id: idea.id, delta: -1 })}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <span className="text-muted-foreground bg-muted/50 ml-auto rounded-full px-2 py-0.5 text-xs capitalize">
                        {idea.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <EmptyState
            description="Try a different filter or add a new idea"
            icon={Lightbulb}
            title="No ideas in this category"
          />
        ) : null}
      {/* Edit dialog */}
      <IdeaEditForm idea={editingIdea} onClose={() => setEditingIdea(null)} />
    </div>
  );
}
