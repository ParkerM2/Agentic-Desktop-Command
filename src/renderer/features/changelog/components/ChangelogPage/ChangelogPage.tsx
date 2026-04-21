import { GitBranch, ScrollText, X } from 'lucide-react';

import { Button, Card, CardContent, EmptyState, Heading } from '@ui';

import { EntryPreview } from '../EntryPreview';
import { GenerateForm } from '../GenerateForm';
import { VersionCard } from '../VersionCard';

import { useChangelogPage } from './useChangelogPage';

export function ChangelogPage() {
  const {
    items,
    isLoading,
    showGenerateDialog,
    setShowGenerateDialog,
    repoPath,
    setRepoPath,
    version,
    setVersion,
    fromTag,
    setFromTag,
    generatedEntry,
    isEditing,
    editableCategories,
    isPending,
    isSavePending,
    errorMessage,
    handleGenerate,
    handleSaveEntry,
    handleCloseDialog,
    handleRemoveItem,
    handleBackToForm,
  } = useChangelogPage();

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
                  isSaving={isSavePending}
                  onBack={handleBackToForm}
                  onRemoveItem={handleRemoveItem}
                  onSave={handleSaveEntry}
                />
              ) : (
                <GenerateForm
                  errorMessage={errorMessage}
                  fromTag={fromTag}
                  isPending={isPending}
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
