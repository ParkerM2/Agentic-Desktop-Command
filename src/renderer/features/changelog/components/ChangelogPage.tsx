import { useState } from 'react';

import { GitBranch, ScrollText, X } from 'lucide-react';

import type { ChangeCategory, ChangelogEntry, ChangeType } from '@shared/types';

import { useAddChangelogEntry, useChangelog, useGenerateChangelog } from '../api/useChangelog';

import { EntryPreview } from './EntryPreview';
import { GenerateForm } from './GenerateForm';
import { VersionCard } from './VersionCard';

export function ChangelogPage() {
  const { data: entries, isLoading } = useChangelog();
  const generateChangelog = useGenerateChangelog();
  const addEntry = useAddChangelogEntry();
  const items = entries ?? [];

  // Generate dialog state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [version, setVersion] = useState('');
  const [fromTag, setFromTag] = useState('');
  const [generatedEntry, setGeneratedEntry] = useState<ChangelogEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableCategories, setEditableCategories] = useState<ChangeCategory[]>([]);

  function handleGenerate(): void {
    if (!repoPath.trim() || !version.trim()) return;

    generateChangelog.mutate(
      {
        repoPath: repoPath.trim(),
        version: version.trim(),
        fromTag: fromTag.trim() || undefined,
      },
      {
        onSuccess: (entry) => {
          setGeneratedEntry(entry);
          setEditableCategories(entry.categories);
          setIsEditing(true);
        },
      },
    );
  }

  function handleSaveEntry(): void {
    if (!generatedEntry) return;

    addEntry.mutate(
      {
        version: generatedEntry.version,
        date: generatedEntry.date,
        categories: editableCategories,
      },
      {
        onSuccess: () => {
          setShowGenerateDialog(false);
          setGeneratedEntry(null);
          setIsEditing(false);
          setEditableCategories([]);
          setRepoPath('');
          setVersion('');
          setFromTag('');
        },
      },
    );
  }

  function handleCloseDialog(): void {
    setShowGenerateDialog(false);
    setGeneratedEntry(null);
    setIsEditing(false);
    setEditableCategories([]);
  }

  function handleRemoveItem(categoryType: ChangeType, itemIndex: number): void {
    setEditableCategories((prev) =>
      prev
        .map((cat) => {
          if (cat.type !== categoryType) return cat;
          const newItems = cat.items.filter((_, idx) => idx !== itemIndex);
          return { ...cat, items: newItems };
        })
        .filter((cat) => cat.items.length > 0),
    );
  }

  function handleBackToForm(): void {
    setIsEditing(false);
    setGeneratedEntry(null);
    setEditableCategories([]);
  }

  const errorMessage = generateChangelog.isError ? generateChangelog.error.message : null;

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ScrollText className="text-muted-foreground h-6 w-6" />
            <h1 className="text-foreground text-2xl font-bold">Changelog</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Version history and release notes</p>
        </div>
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          type="button"
          onClick={() => setShowGenerateDialog(true)}
        >
          <GitBranch className="h-4 w-4" />
          Generate from Git
        </button>
      </div>

      {/* Generate Dialog */}
      {showGenerateDialog ? (
        <div className="border-border bg-card mb-6 rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generate Changelog from Git</h3>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              type="button"
              onClick={handleCloseDialog}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isEditing && generatedEntry ? (
            <EntryPreview
              categories={editableCategories}
              entry={generatedEntry}
              isSaving={addEntry.isPending}
              onBack={handleBackToForm}
              onRemoveItem={handleRemoveItem}
              onSave={handleSaveEntry}
            />
          ) : (
            <GenerateForm
              errorMessage={errorMessage}
              fromTag={fromTag}
              isPending={generateChangelog.isPending}
              repoPath={repoPath}
              version={version}
              onFromTagChange={setFromTag}
              onGenerate={handleGenerate}
              onRepoPathChange={setRepoPath}
              onVersionChange={setVersion}
            />
          )}
        </div>
      ) : null}

      {/* Timeline */}
      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center py-12">
          Loading changelog...
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="relative space-y-8">
          {/* Timeline line */}
          <div className="bg-border absolute top-0 bottom-0 left-[5px] w-px" />

          {items.map((entry) => (
            <VersionCard key={entry.version} entry={entry} />
          ))}
        </div>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <ScrollText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No changelog entries</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Entries will appear here as releases are published
          </p>
        </div>
      ) : null}
    </div>
  );
}
