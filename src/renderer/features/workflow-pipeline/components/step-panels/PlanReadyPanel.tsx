/**
 * PlanReadyPanel — Shows plan content with approve/reject/request-changes actions.
 * The most complex panel: supports plan viewing, editing, and three action flows.
 */

import { useState } from 'react';

import { Edit3, FileText, Play, X } from 'lucide-react';

import type { ProgressTask } from '@shared/types/progress';

import { Button, SectionHeader } from '@ui';

import { useUpdateProgressTask } from '@features/tasks/api/useProgressMutations';

import { MarkdownEditor } from '../shared/MarkdownEditor';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';

interface PlanReadyPanelProps {
  saving?: boolean;
  task: ProgressTask;
  onSavePlan: (text: string) => void;
}

export function PlanReadyPanel({ saving, task, onSavePlan }: PlanReadyPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const updateTask = useUpdateProgressTask();

  const planContent = task.planContent ?? '';

  function handleStartEditing() {
    setEditValue(planContent);
    setIsEditing(true);
  }

  function handleSave() {
    onSavePlan(editValue);
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  function handleApprove() {
    updateTask.mutate({ slug: task.slug, updates: { status: 'executing' } });
  }

  function handleReject() {
    updateTask.mutate({ slug: task.slug, updates: { status: 'backlog' } });
  }

  if (isEditing) {
    return (
      <div className="flex h-80 flex-col space-y-4">
        <SectionHeader icon={FileText} size="sm" title="Edit Plan" />
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
      {/* Header with actions */}
      <SectionHeader icon={FileText} size="sm" title="Agent Plan">
        <div className="flex items-center gap-2">
          <Button size="sm" type="button" variant="secondary" onClick={handleStartEditing}>
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            className="text-success hover:bg-success/10 hover:text-success"
            disabled={updateTask.isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleApprove}
          >
            <Play className="h-3.5 w-3.5" />
            Approve &amp; Execute
          </Button>
          <Button
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={updateTask.isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleReject}
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      </SectionHeader>

      {/* Plan content */}
      {planContent.length > 0 ? (
        <div className="border-border max-h-96 overflow-y-auto rounded-md border p-4">
          <MarkdownRenderer content={planContent} />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm italic">No plan content available.</p>
      )}
    </div>
  );
}
