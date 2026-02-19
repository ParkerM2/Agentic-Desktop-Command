/**
 * MarkdownEditor — Split-pane editor with textarea and live preview.
 * Left panel: editable textarea. Right panel: rendered markdown preview.
 */

import { Group, Panel, Separator } from 'react-resizable-panels';

import { cn } from '@renderer/shared/lib/utils';

import { MarkdownRenderer } from './MarkdownRenderer';

interface MarkdownEditorProps {
  saving?: boolean;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function MarkdownEditor({ saving, value, onChange, onCancel, onSave }: MarkdownEditorProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <Group className="min-h-0 flex-1" orientation="horizontal">
        <Panel defaultSize={50} minSize={20}>
          <textarea
            aria-label="Markdown editor"
            value={value}
            className={cn(
              'h-full w-full resize-none rounded-md border p-4',
              'bg-background text-foreground border-border',
              'font-mono text-sm',
              'focus:ring-ring focus:outline-none focus:ring-2',
            )}
            onChange={(e) => {
              onChange(e.target.value);
            }}
          />
        </Panel>
        <Separator className="mx-1 w-1.5 rounded-full bg-border transition-colors hover:bg-primary" />
        <Panel defaultSize={50} minSize={20}>
          <div className="h-full overflow-y-auto rounded-md border border-border bg-background p-4">
            <MarkdownRenderer content={value} />
          </div>
        </Panel>
      </Group>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          disabled={saving === true}
          type="button"
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          onClick={onSave}
        >
          {saving === true ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
