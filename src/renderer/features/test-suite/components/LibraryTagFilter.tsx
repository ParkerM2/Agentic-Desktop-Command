import { Play } from 'lucide-react';

import type { QaScriptSchema } from '@shared/ipc/test-suite';

import { Badge, Button, Flex } from '@ui';

import type { z } from 'zod';

type QaScript = z.infer<typeof QaScriptSchema>;

interface LibraryTagFilterProps {
  allTags: string[];
  batchRunPending: boolean;
  scripts: QaScript[];
  selectedTags: Set<string>;
  onRunTagged: (scriptIds: string[]) => void;
  onToggleTag: (tag: string) => void;
}

export function LibraryTagFilter({
  allTags,
  batchRunPending,
  scripts,
  selectedTags,
  onRunTagged,
  onToggleTag,
}: LibraryTagFilterProps) {
  if (allTags.length === 0) return null;

  const handleRunTagged = () => {
    const taggedScriptIds = scripts
      .filter((s) => {
        const scriptTags = new Set(s.tags);
        for (const t of selectedTags) {
          if (!scriptTags.has(t)) return false;
        }
        return true;
      })
      .map((s) => s.id);
    onRunTagged(taggedScriptIds);
  };

  return (
    <Flex
      align="center"
      className="px-4 py-1.5 border-b border-border"
      gap="sm"
      wrap="wrap"
    >
      {allTags.map((tag) => (
        <Badge
          key={tag}
          className="cursor-pointer"
          variant={selectedTags.has(tag) ? 'default' : 'outline'}
          onClick={() => onToggleTag(tag)}
        >
          {tag}
        </Badge>
      ))}
      {selectedTags.size > 0 && (
        <Button
          className="ml-2"
          disabled={batchRunPending}
          size="sm"
          variant="ghost"
          onClick={handleRunTagged}
        >
          <Play className="h-3 w-3 mr-1" /> Run Tagged
        </Button>
      )}
    </Flex>
  );
}
