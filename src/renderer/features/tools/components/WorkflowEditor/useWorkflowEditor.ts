import { useEffect, useMemo, useState } from 'react';

import type { WorkflowPhase } from '@shared/ipc/workflow-templates/schemas';

import { useAssistantWidgetStore } from '@renderer/shared/stores/assistant-widget-store';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { useSendCommand } from '@features/assistant/api/useAssistant';
import { useProjects } from '@features/projects/api/useProjects';

import {
  useCreateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  usePluginArtifacts,
  useUpdateTemplate,
  useWorkflowTemplates,
} from '../../api/useWorkflowTemplates';
import { useToolsUI } from '../../store';

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

export { DEFAULT_PHASES };

export function useWorkflowEditor() {
  const { selectedTemplateId, setSelectedTemplateId } = useToolsUI();

  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: projectsData } = useProjects();

  const activeProjectPath = useMemo(() => {
    if (!activeProjectId || !projectsData) return null;
    const project = projectsData.find((p) => p.id === activeProjectId);
    return project?.path ?? null;
  }, [activeProjectId, projectsData]);

  const { data: templates = [] } = useWorkflowTemplates();
  const { data: artifacts = [] } = usePluginArtifacts(activeProjectPath);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const sendCommand = useSendCommand();
  const openWidget = useAssistantWidgetStore((s) => s.open);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phases, setPhases] = useState<WorkflowPhase[]>(DEFAULT_PHASES);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  useEffect(() => {
    if (selectedTemplate) {
      setName(selectedTemplate.name);
      setDescription(selectedTemplate.description);
      const templatePhases = Array.isArray(selectedTemplate.phases) ? selectedTemplate.phases : [];
      setPhases(templatePhases.length > 0 ? templatePhases : DEFAULT_PHASES);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    const first = templates.at(0);
    if (selectedTemplateId === null && first !== undefined) {
      setSelectedTemplateId(first.id);
    }
  }, [selectedTemplateId, templates, setSelectedTemplateId]);

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

  return {
    selectedTemplateId,
    setSelectedTemplateId,
    templates,
    artifacts,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    sendCommand,
    name,
    setName,
    description,
    setDescription,
    phases,
    selectedTemplate,
    handleCreate,
    handleSave,
    handleDelete,
    handleDuplicate,
    handlePhaseUpdate,
    handleGenerate,
    // Derived mutation states
    isCreating: createTemplate.isPending,
    isSaving: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending,
    isDuplicating: duplicateTemplate.isPending,
  };
}
