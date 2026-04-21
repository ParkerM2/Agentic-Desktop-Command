import {
  useDeleteTemplate,
  useDuplicateTemplate,
  useWorkflowTemplates,
} from '../../api/useWorkflowTemplates';
import { useAgentDashboardStore } from '../../store';

interface UseTemplateListPanelReturn {
  templates: ReturnType<typeof useWorkflowTemplates>['data'];
  isLoading: boolean;
  isError: boolean;
  deleteTemplate: ReturnType<typeof useDeleteTemplate>;
  duplicateTemplate: ReturnType<typeof useDuplicateTemplate>;
  selectedTemplateId: string | null;
  handleSelect: (id: string) => void;
  handleEdit: (id: string) => void;
  handleDuplicate: (id: string) => void;
  handleDelete: (id: string) => void;
  handleLaunch: (id: string) => void;
  handleKeyDown: (event: React.KeyboardEvent, id: string) => void;
  openEditor: (id: string | null) => void;
}

export function useTemplateListPanel(): UseTemplateListPanelReturn {
  const { data: templates, isLoading, isError } = useWorkflowTemplates();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const selectedTemplateId = useAgentDashboardStore((s) => s.selectedTemplateId);
  const setSelectedTemplateId = useAgentDashboardStore((s) => s.setSelectedTemplateId);
  const openEditor = useAgentDashboardStore((s) => s.openEditor);
  const openLaunchDialog = useAgentDashboardStore((s) => s.openLaunchDialog);

  function handleSelect(id: string) {
    setSelectedTemplateId(selectedTemplateId === id ? null : id);
  }

  function handleEdit(id: string) {
    openEditor(id);
  }

  function handleDuplicate(id: string) {
    duplicateTemplate.mutate({ id });
  }

  function handleDelete(id: string) {
    deleteTemplate.mutate(id);
  }

  function handleLaunch(id: string) {
    openLaunchDialog(id);
  }

  function handleKeyDown(event: React.KeyboardEvent, id: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(id);
    }
  }

  return {
    templates,
    isLoading,
    isError,
    deleteTemplate,
    duplicateTemplate,
    selectedTemplateId,
    handleSelect,
    handleEdit,
    handleDuplicate,
    handleDelete,
    handleLaunch,
    handleKeyDown,
    openEditor,
  };
}
