import { useMemo, useState } from 'react';

import type { Idea, IdeaCategory } from '@shared/types';

import { useAssistantWidgetStore, useLayoutStore } from '@renderer/shared/stores';

import { useSendCommand } from '@features/assistant';

import { useCreateIdea, useDeleteIdea, useIdeas, useVoteIdea } from '../../api/useIdeas';
import { useIdeaEvents } from '../../hooks/useIdeaEvents';

const DEFAULT_GENERATE_PROMPT =
  'Suggest 3 new feature ideas for my developer productivity project. For each, call the create_idea tool with a clear title and description.';

export function useIdeasPage() {
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

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const idea of allItems) {
      for (const tag of idea.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [allItems]);

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

  return {
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
    isGenerating: sendCommand.isPending,
    handleTagToggle,
    handleClearTags,
    handleCreate,
    handleGenerate,
    onDelete: (id: string) => { deleteIdea.mutate(id); },
    onVote: (id: string, delta: number) => { voteIdea.mutate({ id, delta }); },
  };
}
