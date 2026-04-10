import { useState } from 'react';

import { GitBranch, ScrollText, X } from 'lucide-react';

import type { ChangeCategory, ChangelogEntry, ChangeType } from '@shared/types';

import { Button, Card, CardContent, EmptyState, Heading } from '@ui';

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
    <div className="space-y-6 p-6">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={() => setShowGenerateDialog(true)}>
          <GitBranch className="h-4 w-4" />
          Generate from Git
        </Button>
      </div>
        {/* Generate Dialog */}
        {showGenerateDialog ? (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <Heading as="h3">Generate Changelog from Git</Heading>
                <Button
                  aria-label="Close"
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={handleCloseDialog}
                >
                  <X className="h-5 w-5" />
                </Button>
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
            </CardContent>
          </Card>
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
          <EmptyState
            className="border-border rounded-lg border border-dashed"
            description="Entries will appear here as releases are published"
            icon={ScrollText}
            size="md"
            title="No changelog entries"
          />
        ) : null}
    </div>
  );
}
