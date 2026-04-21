import { useEffect, useState } from 'react';

import type { WorkflowTemplate } from '@shared/ipc/workflow-templates/schemas';

import { useAgentDefinitions } from '../../api/useWorkflowEngine';
import { useCreateTemplate, useUpdateTemplate, useWorkflowTemplate } from '../../api/useWorkflowTemplates';
import { useAgentDashboardStore } from '../../store';

// ─── Types ───────────────────────────────────────────────────

type TemplateFormValues = Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltin'>;

const DEFAULTS: TemplateFormValues = {
  name: '',
  description: '',
  mode: 'standard',
  branching: {
    featurePrefix: 'feature',
    workPrefix: 'work',
    useWorktrees: true,
  },
  team: {
    maxConcurrentAgents: 3,
    spawnQaPerTask: true,
    enableGuardian: true,
    roles: [],
  },
  qa: {
    runLint: true,
    runTypecheck: true,
    runBuild: false,
    runTests: false,
    maxRounds: 2,
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
    maxFileSizeLines: 300,
  },
  phases: [
    { name: 'brainstorming', strategy: 'skip', prompt: '', summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] } },
    { name: 'planning', strategy: 'skip', prompt: '', summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] } },
    { name: 'implementation', strategy: 'skip', prompt: '', summarySpec: { maxChars: 300, tableFields: ['Approach', 'Risk', 'Estimate'] } },
  ],
};

interface UseTemplateEditorPanelReturn {
  isEditorOpen: boolean;
  editingTemplateId: string | null;
  isNew: boolean;
  isLoading: boolean;
  values: TemplateFormValues;
  setValues: React.Dispatch<React.SetStateAction<TemplateFormValues>>;
  isPending: boolean;
  agentDefs: ReturnType<typeof useAgentDefinitions>['data'];
  isLoadingDefs: boolean;
  handleClose: () => void;
  handleSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
}

export function useTemplateEditorPanel(): UseTemplateEditorPanelReturn {
  const isEditorOpen = useAgentDashboardStore((s) => s.isEditorOpen);
  const editingTemplateId = useAgentDashboardStore((s) => s.editingTemplateId);
  const closeEditor = useAgentDashboardStore((s) => s.closeEditor);

  const isNew = editingTemplateId === null;
  const { data: existing, isLoading } = useWorkflowTemplate(editingTemplateId);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const { data: agentDefs, isLoading: isLoadingDefs } = useAgentDefinitions();

  const [values, setValues] = useState<TemplateFormValues>(DEFAULTS);

  useEffect(() => {
    if (existing !== undefined) {
      setValues({
        name: existing.name,
        description: existing.description,
        mode: existing.mode,
        branching: { ...existing.branching },
        team: { ...existing.team, roles: [...existing.team.roles] },
        qa: { ...existing.qa },
        permissions: { ...existing.permissions },
        guardian: {
          ...existing.guardian,
          blockingRules: [...existing.guardian.blockingRules],
          warningRules: [...existing.guardian.warningRules],
        },
        phases: existing.phases.map((p) => ({ ...p, summarySpec: { ...p.summarySpec } })),
      });
    } else if (isNew) {
      setValues(DEFAULTS);
    }
  }, [existing, isNew]);

  function handleClose() {
    closeEditor();
    setValues(DEFAULTS);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isNew) {
      createTemplate.mutate(values, { onSuccess: () => handleClose() });
    } else {
      updateTemplate.mutate(
        { id: editingTemplateId, updates: values },
        { onSuccess: () => handleClose() },
      );
    }
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return {
    isEditorOpen,
    editingTemplateId,
    isNew,
    isLoading,
    values,
    setValues,
    isPending,
    agentDefs,
    isLoadingDefs,
    handleClose,
    handleSubmit,
  };
}
