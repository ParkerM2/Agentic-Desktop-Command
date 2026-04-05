import { Button, Input, Label, Text } from '@ui';

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
        <Label htmlFor="repoPath">Repository Path</Label>
        <Input
          className="mt-1"
          id="repoPath"
          placeholder="/path/to/your/repo"
          type="text"
          value={repoPath}
          onChange={(e) => onRepoPathChange(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="version">Version</Label>
        <Input
          className="mt-1"
          id="version"
          placeholder="v1.0.0"
          type="text"
          value={version}
          onChange={(e) => onVersionChange(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="fromTag">From Tag (optional)</Label>
        <Input
          className="mt-1"
          id="fromTag"
          placeholder="v0.9.0"
          type="text"
          value={fromTag}
          onChange={(e) => onFromTagChange(e.target.value)}
        />
        <Text className="mt-1" size="sm" variant="muted">
          Leave empty to include all recent commits
        </Text>
      </div>
      <Button
        disabled={!repoPath.trim() || !version.trim() || isPending}
        type="button"
        onClick={onGenerate}
      >
        {isPending ? 'Generating...' : 'Generate'}
      </Button>
      {errorMessage ? (
        <Text size="sm" variant="error">
          Error: {errorMessage}
        </Text>
      ) : null}
    </div>
  );
}
