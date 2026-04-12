import { useMemo, useState } from 'react';

import { Lightbulb, Plus, Sparkles } from 'lucide-react';

import type { Idea, IdeaCategory } from '@shared/types';

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

import { IdeaCard } from './IdeaCard';
import { IdeaEditForm } from './IdeaEditForm';
import { IdeationFilterRow } from './IdeationFilterRow';

const CATEGORY_OPTIONS: IdeaCategory[] = ['feature', 'improvement', 'bug', 'performance'];

const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  feature: 'Feature',
  improvement: 'Improvement',
  bug: 'Bug',
  performance: 'Performance',
};

const DEFAULT_GENERATE_PROMPT =
  'Suggest 3 new feature ideas for my developer productivity project. For each, call the create_idea tool with a clear title and description.';

export function IdeationPage() {
  useIdeaEvents();
  const [activeFilter, setActiveFilter] = useState<IdeaCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  const allItems = useMemo(() => ideas ?? [], [ideas]);

  // Collect all unique tags from all ideas for the tag filter
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const idea of allItems) {
      for (const tag of idea.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [allItems]);

  // Client-side filters: search query + tag (all compose together)
  const items = useMemo(() => {
    const hasTagFilters = selectedTags.length > 0;
    const query = searchQuery.trim().toLowerCase();
    const hasSearch = query.length > 0;

    return allItems.filter((idea) => {
      if (hasTagFilters && !selectedTags.some((tag) => idea.tags.includes(tag))) {
        return false;
      }
      if (
        hasSearch &&
        !idea.title.toLowerCase().includes(query) &&
        !idea.description.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [allItems, selectedTags, searchQuery]);

  function handleTagToggle(tag: string): void {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleClearTags(): void {
    setSelectedTags([]);
  }

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
                      {CATEGORY_LABELS[cat]}
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
        <div className="mb-6">
          <IdeationFilterRow
            activeFilter={activeFilter}
            allTags={allTags}
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            onClearTags={handleClearTags}
            onFilterChange={setActiveFilter}
            onSearchChange={setSearchQuery}
            onTagToggle={handleTagToggle}
          />
        </div>

        {/* Ideas Grid */}
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center py-12">
            Loading ideas...
          </div>
        ) : null}

        {!isLoading && (items.length > 0) ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onDelete={(id) => deleteIdea.mutate(id)}
                onEdit={setEditingIdea}
                onVote={(id, delta) => voteIdea.mutate({ id, delta })}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && (items.length === 0) ? (
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
