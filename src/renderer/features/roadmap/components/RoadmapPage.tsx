import { useState } from 'react';

import { CheckCircle2, Circle, Clock, Map, Plus, Sparkles, Square, SquareCheck, Trash2 } from 'lucide-react';

import type { Milestone, MilestoneStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';
import { useAssistantWidgetStore, useLayoutStore } from '@renderer/shared/stores';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@ui';

import { useSendCommand } from '@features/assistant';
import { useProjects } from '@features/projects';


import {
  useAddMilestoneTask,
  useCreateMilestone,
  useDeleteMilestone,
  useMilestones,
  useToggleMilestoneTask,
  useUpdateMilestone,
} from '../api/useMilestones';
import { useMilestoneEvents } from '../hooks/useMilestoneEvents';

const STATUS_CONFIG: Record<
  MilestoneStatus,
  {
    icon: typeof CheckCircle2;
    label: string;
    barClass: string;
    iconClass: string;
  }
> = {
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    barClass: 'bg-primary',
    iconClass: 'text-primary',
  },
  'in-progress': {
    icon: Clock,
    label: 'In Progress',
    barClass: 'bg-primary',
    iconClass: 'text-primary',
  },
  planned: {
    icon: Circle,
    label: 'Planned',
    barClass: 'bg-muted-foreground',
    iconClass: 'text-muted-foreground',
  },
};

function computeProgress(milestone: Milestone): number {
  if (milestone.tasks.length === 0) {
    if (milestone.status === 'completed') return 100;
    if (milestone.status === 'in-progress') return 50;
    return 0;
  }
  const completed = milestone.tasks.filter((t) => t.completed).length;
  return Math.round((completed / milestone.tasks.length) * 100);
}

function MilestoneCard({
  milestone,
  onDelete,
  onStatusChange,
}: {
  milestone: Milestone;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: MilestoneStatus) => void;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const addTask = useAddMilestoneTask();
  const toggleTask = useToggleMilestoneTask();
  const config = STATUS_CONFIG[milestone.status];
  const StatusIcon = config.icon;
  const progress = computeProgress(milestone);

  function handleAddTask(): void {
    if (!newTaskTitle.trim()) return;
    addTask.mutate({ milestoneId: milestone.id, title: newTaskTitle.trim() });
    setNewTaskTitle('');
  }

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('h-5 w-5', config.iconClass)} />
          <h3 className="font-medium">{milestone.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={milestone.status}
            onValueChange={(v) => onStatusChange(milestone.id, v as MilestoneStatus)}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="text-muted-foreground hover:text-destructive"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onDelete(milestone.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-2 text-sm">{milestone.description}</p>
      <p className="text-muted-foreground mb-3 text-xs">
        Target: {new Date(milestone.targetDate).toLocaleDateString()}
      </p>

      {/* Progress Bar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full transition-all', config.barClass)}
            style={{ width: `${String(progress)}%` }}
          />
        </div>
        <span className="text-muted-foreground w-10 text-right text-xs font-medium">
          {progress}%
        </span>
      </div>

      {/* Tasks */}
      {milestone.tasks.length > 0 ? (
        <div className="mb-3 space-y-1">
          {milestone.tasks.map((task) => (
            <Button
              key={task.id}
              className="hover:bg-muted/50 flex h-auto w-full items-center justify-start gap-2 rounded px-1 py-0.5 text-left text-sm"
              type="button"
              variant="ghost"
              onClick={() => toggleTask.mutate({ milestoneId: milestone.id, taskId: task.id })}
            >
              {task.completed ? (
                <SquareCheck className="text-primary h-4 w-4 shrink-0" />
              ) : (
                <Square className="text-muted-foreground h-4 w-4 shrink-0" />
              )}
              <span className={cn(task.completed && 'text-muted-foreground line-through')}>
                {task.title}
              </span>
            </Button>
          ))}
        </div>
      ) : null}

      {/* Add task input */}
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Add a task..."
          size="sm"
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTask();
          }}
        />
        <Button
          size="icon"
          type="button"
          variant="ghost"
          onClick={handleAddTask}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const DEFAULT_GENERATE_PROMPT =
  'Create a new milestone for my project roadmap. Include a clear title, description, and target date about 4 weeks from now. Call the create_milestone tool to add it.';

export function RoadmapPage() {
  useMilestoneEvents();
  const { data: milestones, isLoading } = useMilestones();
  const createMilestone = useCreateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const updateMilestone = useUpdateMilestone();

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState(DEFAULT_GENERATE_PROMPT);

  const sendCommand = useSendCommand();
  const openWidget = useAssistantWidgetStore((s) => s.open);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();

  function handleCreate(): void {
    if (!formTitle.trim() || !formDate) return;
    createMilestone.mutate({
      title: formTitle.trim(),
      description: formDescription.trim(),
      targetDate: new Date(formDate).toISOString(),
    });
    setFormTitle('');
    setFormDescription('');
    setFormDate('');
    setShowForm(false);
  }

  function handleGenerate(): void {
    if (!generatePrompt.trim() || sendCommand.isPending) return;
    const activeProject = projects?.find((p) => p.id === activeProjectId);
    openWidget();
    sendCommand.mutate({
      input: generatePrompt.trim(),
      projectPath: activeProject?.path ?? '',
      context: { activeView: 'roadmap', activeProjectId: activeProjectId ?? undefined },
    });
    setShowGenerate(false);
    setGeneratePrompt(DEFAULT_GENERATE_PROMPT);
  }

  const items = milestones ?? [];
  const completedCount = items.filter((m) => m.status === 'completed').length;
  const totalProgress =
    items.length > 0
      ? Math.round(items.reduce((sum, m) => sum + computeProgress(m), 0) / items.length)
      : 0;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Map className="text-primary h-6 w-6" />
              <h1 className="text-2xl font-bold">Roadmap</h1>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">Project milestones and progress</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowGenerate(!showGenerate);
                setShowForm(false);
              }}
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowForm(!showForm);
                setShowGenerate(false);
              }}
            >
              <Plus className="h-4 w-4" />
              New Milestone
            </Button>
          </div>
        </div>

        {/* Generate with AI Panel */}
        {showGenerate ? (
          <div className="border-border bg-card mb-6 space-y-3 rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">
              Describe what milestones you want the assistant to generate. It will create them directly on your roadmap.
            </p>
            <Textarea
              resize="none"
              rows={3}
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) handleGenerate();
              }}
            />
            <div className="flex gap-2">
              <Button
                disabled={sendCommand.isPending || !generatePrompt.trim()}
                type="button"
                onClick={handleGenerate}
              >
                {sendCommand.isPending ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGenerate(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {/* Create Form */}
        {showForm ? (
          <div className="border-border bg-card mb-6 space-y-3 rounded-lg border p-4">
            <Input
              placeholder="Milestone title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description"
              resize="none"
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
            <Input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" onClick={handleCreate}>
                Create
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="border-border bg-card rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
              Total Milestones
            </div>
            <p className="text-lg font-semibold">{items.length}</p>
          </div>
          <div className="border-border bg-card rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
              Completed
            </div>
            <p className="text-lg font-semibold">
              {completedCount} / {items.length}
            </p>
          </div>
          <div className="border-border bg-card rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
              Overall Progress
            </div>
            <p className="text-lg font-semibold">{totalProgress}%</p>
          </div>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center py-12">
            Loading milestones...
          </div>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <section>
            <h2 className="text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase">
              Timeline
            </h2>
            <div className="space-y-4">
              {items.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onDelete={(id) => deleteMilestone.mutate(id)}
                  onStatusChange={(id, status) => updateMilestone.mutate({ id, status })}
                />
              ))}
            </div>
          </section>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <div className="border-border rounded-lg border border-dashed p-12 text-center">
            <Map className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No milestones yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Create your first milestone to start planning
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
