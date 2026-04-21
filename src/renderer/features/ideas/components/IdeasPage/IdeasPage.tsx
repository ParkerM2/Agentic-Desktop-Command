import { Lightbulb, Plus, Sparkles } from 'lucide-react';

import type { IdeaCategory } from '@shared/types';

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

import { IdeaCard } from '../IdeaCard';
import { IdeaEditForm } from '../IdeaEditForm';
import { IdeationFilterRow } from '../IdeasFilterRow';

import { useIdeasPage } from './useIdeasPage';

const CATEGORY_OPTIONS: IdeaCategory[] = ['feature', 'improvement', 'bug', 'performance'];

const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  feature: 'Feature',
  improvement: 'Improvement',
  bug: 'Bug',
  performance: 'Performance',
};

export function IdeationPage() {
  const {
    items,
    allTags,
    isLoading,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    selectedTags,
    showForm,
    setShowForm,
    formTitle,
    setFormTitle,
    formDescription,
    setFormDescription,
    formCategory,
    setFormCategory,
    editingIdea,
    setEditingIdea,
    showGenerate,
    setShowGenerate,
    generatePrompt,
    setGeneratePrompt,
    isGenerating,
    handleTagToggle,
    handleClearTags,
    handleCreate,
    handleGenerate,
    onDelete,
    onVote,
  } = useIdeasPage();

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
              onChange={(e) => { setGeneratePrompt(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) handleGenerate();
              }}
            />
            <div className="flex gap-2">
              <Button
                disabled={isGenerating || !generatePrompt.trim()}
                type="button"
                onClick={handleGenerate}
              >
                {isGenerating ? (
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
                onClick={() => { setShowGenerate(false); }}
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
              onChange={(e) => { setFormTitle(e.target.value); }}
            />
            <Textarea
              placeholder="Description"
              resize="none"
              rows={2}
              value={formDescription}
              onChange={(e) => { setFormDescription(e.target.value); }}
            />
            <Select
              value={formCategory}
              onValueChange={(v) => { setFormCategory(v as IdeaCategory); }}
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
                onClick={() => { setShowForm(false); }}
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

      {!isLoading && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onDelete={onDelete}
              onEdit={setEditingIdea}
              onVote={onVote}
            />
          ))}
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
      <IdeaEditForm idea={editingIdea} onClose={() => { setEditingIdea(null); }} />
    </div>
  );
}
