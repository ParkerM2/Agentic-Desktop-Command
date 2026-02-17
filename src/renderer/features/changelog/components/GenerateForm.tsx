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

export function GenerateForm({
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
      {errorMessage ? <p className="text-destructive text-sm">Error: {errorMessage}</p> : null}
    </div>
  );
}
