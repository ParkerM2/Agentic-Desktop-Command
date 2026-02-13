import { useState } from 'react';

import { Edit, GitBranch, Plus, RefreshCw, Save, ScrollText, Shield, Trash2, Wrench, X } from 'lucide-react';

import type { ChangeCategory, ChangelogEntry, ChangeType } from '@shared/types';

import { useAddChangelogEntry, useChangelog, useGenerateChangelog } from '../api/useChangelog';

const CATEGORY_CONFIG: Record<
  ChangeType,
  { label: string; icon: React.ComponentType<{ className?: string }>; cssVar: string }
> = {
  added: { label: 'Added', icon: Plus, cssVar: '--success' },
  changed: { label: 'Changed', icon: RefreshCw, cssVar: '--info' },
  fixed: { label: 'Fixed', icon: Wrench, cssVar: '--warning' },
  removed: { label: 'Removed', icon: Trash2, cssVar: '--destructive' },
  security: { label: 'Security', icon: Shield, cssVar: '--warning' },
  deprecated: { label: 'Deprecated', icon: X, cssVar: '--muted-foreground' },
};

function CategorySection({ category }: { category: ChangeCategory }) {
  const config = CATEGORY_CONFIG[category.type];
  const IconComponent = config.icon;

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: `hsl(var(${config.cssVar}))` }}
      >
        <IconComponent className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
      <ul className="text-foreground space-y-1 pl-6 text-sm">
        {category.items.map((item) => (
          <li key={item} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VersionCard({
  entry,
}: {
  entry: { version: string; date: string; categories: ChangeCategory[] };
}) {
  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="border-primary bg-primary/30 absolute top-1 left-0 h-3 w-3 rounded-full border-2" />

      {/* Version header */}
      <div className="mb-3">
        <h3 className="text-foreground text-lg font-semibold">
          {entry.version}{' '}
          <span className="text-muted-foreground text-sm font-normal">-- {entry.date}</span>
        </h3>
      </div>

      {/* Content card */}
      <div className="border-border bg-card space-y-4 rounded-lg border p-4">
        {entry.categories.map((category) => (
          <CategorySection key={category.type} category={category} />
        ))}
      </div>
    </div>
  );
}

interface GenerateFormProps {
  repoPath: string;
  version: string;
  fromTag: string;
  isPending: boolean;
  errorMessage: string | null;
  onRepoPathChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onFromTagChange: (value: string) => void;
  onGenerate: () => void;
}

function GenerateForm({
  repoPath,
  version,
  fromTag,
  isPending,
  errorMessage,
  onRepoPathChange,
  onVersionChange,
  onFromTagChange,
  onGenerate,
}: GenerateFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium" htmlFor="repoPath">
          Repository Path
        </label>
        <input
          className="bg-muted text-foreground placeholder:text-muted-foreground mt-1 w-full rounded px-3 py-2 text-sm"
          id="repoPath"
          placeholder="/path/to/your/repo"
          type="text"
          value={repoPath}
          onChange={(e) => onRepoPathChange(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="version">
          Version
        </label>
        <input
          className="bg-muted text-foreground placeholder:text-muted-foreground mt-1 w-full rounded px-3 py-2 text-sm"
          id="version"
          placeholder="v1.0.0"
          type="text"
          value={version}
          onChange={(e) => onVersionChange(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="fromTag">
          From Tag (optional)
        </label>
        <input
          className="bg-muted text-foreground placeholder:text-muted-foreground mt-1 w-full rounded px-3 py-2 text-sm"
          id="fromTag"
          placeholder="v0.9.0"
          type="text"
          value={fromTag}
          onChange={(e) => onFromTagChange(e.target.value)}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Leave empty to include all recent commits
        </p>
      </div>
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        disabled={!repoPath.trim() || !version.trim() || isPending}
        type="button"
        onClick={onGenerate}
      >
        {isPending ? 'Generating...' : 'Generate'}
      </button>
      {errorMessage ? (
        <p className="text-destructive text-sm">Error: {errorMessage}</p>
      ) : null}
    </div>
  );
}

interface EditableCategoryProps {
  category: ChangeCategory;
  onRemoveItem: (index: number) => void;
}

function EditableCategory({ category, onRemoveItem }: EditableCategoryProps) {
  const config = CATEGORY_CONFIG[category.type];
  const IconComponent = config.icon;

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: `hsl(var(${config.cssVar}))` }}
      >
        <IconComponent className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
      <ul className="space-y-1 pl-6">
        {category.items.map((item, idx) => (
          <li
            key={`${category.type}-${item.slice(0, 20)}`}
            className="group flex items-start gap-2"
          >
            <span className="text-muted-foreground">-</span>
            <span className="flex-1 text-sm">{item}</span>
            <button
              className="text-muted-foreground hover:text-destructive opacity-0 transition-all group-hover:opacity-100"
              type="button"
              onClick={() => onRemoveItem(idx)}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface EntryPreviewProps {
  entry: ChangelogEntry;
  categories: ChangeCategory[];
  isSaving: boolean;
  onRemoveItem: (categoryType: ChangeType, index: number) => void;
  onSave: () => void;
  onBack: () => void;
}

function EntryPreview({
  entry,
  categories,
  isSaving,
  onRemoveItem,
  onSave,
  onBack,
}: EntryPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Edit className="h-4 w-4" />
          <span>Preview and edit before saving</span>
        </div>
      </div>

      <div className="border-border bg-muted/50 rounded-lg border p-4">
        <div className="mb-3">
          <span className="text-lg font-semibold">{entry.version}</span>
          <span className="text-muted-foreground ml-2 text-sm">-- {entry.date}</span>
        </div>

        {categories.length > 0 ? (
          <div className="space-y-4">
            {categories.map((category) => (
              <EditableCategory
                key={category.type}
                category={category}
                onRemoveItem={(idx) => onRemoveItem(category.type, idx)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No changes found in the commit history
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          disabled={categories.length === 0 || isSaving}
          type="button"
          onClick={onSave}
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save to Changelog'}
        </button>
        <button
          className="bg-muted text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm transition-colors"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
      </div>
    </div>
  );
}

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
          // Reset all state
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

  const errorMessage = generateChangelog.isError
    ? generateChangelog.error.message
    : null;

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
