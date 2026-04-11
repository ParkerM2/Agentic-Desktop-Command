/**
 * BacklogPanel — Shows task description with view/edit toggle.
 * View mode uses MarkdownRenderer, edit mode uses MarkdownEditor.
 */

import { useState } from 'react';

import { Edit3, FileText } from 'lucide-react';

import type { ProgressTask } from '@shared/types/progress';

import { Button, SectionHeader } from '@ui';

import { MarkdownEditor } from '../shared/MarkdownEditor';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';

interface BacklogPanelProps {
  saving?: boolean;
  task: ProgressTask;
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
        <SectionHeader icon={FileText} size="sm" title="Edit Description" />
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
      <SectionHeader icon={FileText} size="sm" title="Task Description">
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={handleStartEditing}
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </Button>
      </SectionHeader>

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
