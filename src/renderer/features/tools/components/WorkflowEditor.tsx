/**
 * WorkflowEditor — Main workflow template editor
 *
 * Combines a sidebar template list with a detail panel for editing
 * name, description, and phase configurations. Supports CRUD operations,
 * duplication, and sending phase prompts to the assistant widget.
 */

import { useEffect, useMemo, useState } from 'react';

import { Copy, Save, Trash2 } from 'lucide-react';

import type { WorkflowPhase } from '@shared/ipc/workflow-templates/schemas';

import { useAssistantWidgetStore } from '@renderer/shared/stores/assistant-widget-store';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { Button, Input, Label, ScrollArea, Text, Textarea } from '@ui';

import { useSendCommand } from '@features/assistant/api/useAssistant';
import { useProjects } from '@features/projects/api/useProjects';

import {
  useCreateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  usePluginArtifacts,
  useUpdateTemplate,
  useWorkflowTemplates,
} from '../api/useWorkflowTemplates';
import { useToolsUI } from '../store';

import { PhaseSection } from './PhaseSection';
import { WorkflowSidebar } from './WorkflowSidebar';

// ─── Defaults ───────────────────────────────────────────────

const DEFAULT_PHASES: WorkflowPhase[] = [
  {
    name: 'brainstorming',
    strategy: 'skip',
    prompt: '',
    summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] },
  },
  {
    name: 'planning',
    strategy: 'skip',
    prompt: '',
    summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] },
  },
  {
    name: 'implementation',
    strategy: 'skip',
    prompt: '',
    summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] },
  },
];

// ─── Component ──────────────────────────────────────────────

export function WorkflowEditor() {
  const { selectedTemplateId, setSelectedTemplateId } = useToolsUI();

  // Active project path for plugin artifacts
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: projectsData } = useProjects();

  const activeProjectPath = useMemo(() => {
    if (!activeProjectId || !projectsData) return null;
    const project = projectsData.find((p) => p.id === activeProjectId);
    return project?.path ?? null;
  }, [activeProjectId, projectsData]);

  // Queries
  const { data: templates = [] } = useWorkflowTemplates();
  const { data: artifacts = [] } = usePluginArtifacts(activeProjectPath);

  // Mutations
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  // Assistant
  const sendCommand = useSendCommand();
  const openWidget = useAssistantWidgetStore((s) => s.open);

  // Local form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phases, setPhases] = useState<WorkflowPhase[]>(DEFAULT_PHASES);

  // Sync form state from selected template
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  useEffect(() => {
    if (selectedTemplate) {
      setName(selectedTemplate.name);
      setDescription(selectedTemplate.description);
      const templatePhases = Array.isArray(selectedTemplate.phases) ? selectedTemplate.phases : [];
      setPhases(templatePhases.length > 0 ? templatePhases : DEFAULT_PHASES);
    }
  }, [selectedTemplate]);

  // Auto-select first template on mount
  useEffect(() => {
    const first = templates.at(0);
    if (selectedTemplateId === null && first !== undefined) {
      setSelectedTemplateId(first.id);
    }
  }, [selectedTemplateId, templates, setSelectedTemplateId]);

  // ─── Handlers ──────────────────────────────────────────────

  function handleCreate() {
    createTemplate.mutate(
      {
        name: 'New Workflow',
        description: '',
        mode: 'standard',
        branching: { featurePrefix: 'feature', workPrefix: 'work', useWorktrees: true },
        team: {
          maxConcurrentAgents: 3,
          spawnQaPerTask: true,
          enableGuardian: true,
          roles: [],
        },
        qa: {
          runLint: true,
          runTypecheck: true,
          runBuild: true,
          runTests: false,
          maxRounds: 3,
        },
        permissions: {
          allowPush: false,
          allowCreatePr: false,
          allowDeleteBranch: false,
          allowShellExec: false,
        },
        guardian: {
          blockingRules: [],
          warningRules: [],
          maxFileSizeLines: 500,
        },
        phases: DEFAULT_PHASES,
      },
      {
        onSuccess: (result) => {
          setSelectedTemplateId(result.template.id);
        },
      },
    );
  }

  function handleSave() {
    if (selectedTemplateId === null) return;
    updateTemplate.mutate({
      id: selectedTemplateId,
      updates: { name, description, phases },
    });
  }

  function handleDelete() {
    if (selectedTemplateId === null) return;
    deleteTemplate.mutate(selectedTemplateId, {
      onSuccess: () => {
        setSelectedTemplateId(null);
      },
    });
  }

  function handleDuplicate() {
    if (selectedTemplateId === null) return;
    duplicateTemplate.mutate(
      { id: selectedTemplateId },
      {
        onSuccess: (result) => {
          setSelectedTemplateId(result.template.id);
        },
      },
    );
  }

  function handlePhaseUpdate(index: number, updates: Partial<WorkflowPhase>) {
    setPhases((prev) =>
      prev.map((phase, i) => (i === index ? { ...phase, ...updates } : phase)),
    );
  }

  function handleGenerate(prompt: string) {
    openWidget();
    sendCommand.mutate({ input: prompt, context: { activeView: 'tools' } });
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="flex h-full">
      <WorkflowSidebar
        selectedId={selectedTemplateId}
        templates={templates}
        onNew={handleCreate}
        onSelect={setSelectedTemplateId}
      />

      <div className="flex-1">
        {selectedTemplate ? (
          <ScrollArea className="h-full">
            <div className="max-w-2xl space-y-4 p-6">
              <div className="space-y-1.5">
                <Label htmlFor="template-name">Name</Label>
                <Input
                  id="template-name"
                  placeholder="Workflow name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  placeholder="Short description..."
                  resize="none"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {phases.map((phase, index) => (
                <PhaseSection
                  key={phase.name}
                  artifacts={artifacts}
                  isGenerating={sendCommand.isPending}
                  phase={phase}
                  onGenerate={handleGenerate}
                  onUpdate={(updates) => handlePhaseUpdate(index, updates)}
                />
              ))}

              <div className="flex items-center gap-2 pt-4">
                <Button
                  disabled={updateTemplate.isPending || name.trim().length === 0}
                  onClick={handleSave}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  Save
                </Button>
                <Button
                  disabled={duplicateTemplate.isPending}
                  variant="outline"
                  onClick={handleDuplicate}
                >
                  <Copy className="mr-1.5 h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  disabled={deleteTemplate.isPending || (selectedTemplate.isBuiltin)}
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Text className="text-muted-foreground">
              Select a workflow template or create a new one.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
