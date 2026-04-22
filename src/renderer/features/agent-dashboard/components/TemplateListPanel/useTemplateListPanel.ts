import {
  useDeleteTemplate,
  useDuplicateTemplate,
  useWorkflowTemplates,
} from '../../api/useWorkflowTemplates';
import { useAsyncRender } from '../../hooks/useAsyncRender';
import { useAgentDashboardStore } from '../../store';

export function useTemplateListPanel() {
  const query = useWorkflowTemplates();
  const { data: templates, isLoading, isError, isEmpty } = useAsyncRender(query);
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
    isEmpty,
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
