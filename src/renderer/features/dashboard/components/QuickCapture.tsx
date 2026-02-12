/**
 * QuickCapture — Quick text input for ideas, tasks, and notes
 */

import { useState } from 'react';

import { Plus, X } from 'lucide-react';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

import { useDashboardStore } from '../store';

const MAX_RECENT = 5;

export function QuickCapture() {
  const [inputValue, setInputValue] = useState('');
  const { quickCaptures, addCapture, removeCapture } = useDashboardStore();

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;
    addCapture(trimmed);
    setInputValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  const recentCaptures = quickCaptures.slice(0, MAX_RECENT);

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <h2 className="text-foreground mb-3 text-sm font-semibold">Quick Capture</h2>

      <div className="flex gap-2">
        <input
          placeholder="Quick idea, task, or note..."
          type="text"
          value={inputValue}
          className={cn(
            'border-border bg-background text-foreground flex-1 rounded-md border px-3 py-1.5 text-sm',
            'placeholder:text-muted-foreground',
            'focus:ring-ring focus:ring-1 focus:outline-none',
          )}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          disabled={inputValue.trim().length === 0}
          className={cn(
            'bg-primary text-primary-foreground rounded-md px-3 py-1.5',
            'hover:bg-primary/90 transition-colors',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
          onClick={handleSubmit}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {recentCaptures.length > 0 && (
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
              <button
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => removeCapture(capture.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
