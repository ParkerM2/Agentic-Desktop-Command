/**
 * MarkdownEditor — Split-pane editor with textarea and live preview.
 * Left panel: editable textarea. Right panel: rendered markdown preview.
 */

import { Group, Panel, Separator } from 'react-resizable-panels';

import { Button, Textarea } from '@ui';

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
          <Textarea
            aria-label="Markdown editor"
            className="h-full w-full resize-none rounded-md border p-4 font-mono text-sm focus:ring-2"
            value={value}
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
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={saving === true}
          type="button"
          onClick={onSave}
        >
          {saving === true ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
