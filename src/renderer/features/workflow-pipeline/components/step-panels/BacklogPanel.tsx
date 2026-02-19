/**
 * BacklogPanel — Shows task description with view/edit toggle.
 * View mode uses MarkdownRenderer, edit mode uses MarkdownEditor.
 */

import { useState } from 'react';

import { Edit3, FileText } from 'lucide-react';

import type { Task } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { MarkdownEditor } from '../shared/MarkdownEditor';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';

interface BacklogPanelProps {
  saving?: boolean;
  task: Task;
  onSaveDescription: (text: string) => void;
}

export function BacklogPanel({ saving, task, onSaveDescription }: BacklogPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  function handleStartEditing() {
    setEditValue(task.description);
    setIsEditing(true);
  }

  function handleSave() {
    onSaveDescription(editValue);
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex h-80 flex-col space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
          <h3 className="text-foreground text-sm font-medium">Edit Description</h3>
        </div>
        <div className="min-h-0 flex-1">
          <MarkdownEditor
            saving={saving}
            value={editValue}
            onCancel={handleCancel}
            onChange={setEditValue}
            onSave={handleSave}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
          <h3 className="text-foreground text-sm font-medium">Task Description</h3>
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          onClick={handleStartEditing}
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {task.description.length > 0 ? (
        <div className="border-border rounded-md border p-4">
          <MarkdownRenderer content={task.description} />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm italic">No description provided.</p>
      )}
    </div>
  );
}
