/**
 * QuickCapture — Quick text input for ideas, tasks, and notes
 *
 * Persists captures via IPC (dashboard.captures.*) so they survive restarts.
 */

import { useState } from 'react';

import { Plus, X } from 'lucide-react';

import { formatRelativeTime } from '@renderer/shared/lib/utils';

import { Button, Card, CardContent, Input } from '@ui';

import { useCaptureMutations, useCaptures } from '../api/useCaptures';

const MAX_RECENT = 5;

export function QuickCapture() {
  const [inputValue, setInputValue] = useState('');
  const { data: captures } = useCaptures();
  const { createCapture, deleteCapture } = useCaptureMutations();

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;
    createCapture.mutate(trimmed);
    setInputValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  const recentCaptures = (captures ?? []).slice(0, MAX_RECENT);

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-foreground mb-3 text-sm font-semibold">Quick Capture</p>

        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="Quick idea, task, or note..."
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            disabled={inputValue.trim().length === 0}
            size="md"
            type="button"
            onClick={handleSubmit}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {recentCaptures.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {recentCaptures.map((capture) => (
              <li
                key={capture.id}
                className="border-border flex items-start gap-2 rounded-md border px-3 py-2"
              >
                <p className="text-foreground min-w-0 flex-1 text-xs">{capture.text}</p>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatRelativeTime(capture.createdAt)}
                </span>
                <Button
                  aria-label="Remove capture"
                  className="text-muted-foreground hover:text-foreground h-auto shrink-0 p-0"
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => deleteCapture.mutate(capture.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
