/**
 * WorkflowEditor — Main workflow template editor
 *
 * Combines a sidebar template list with a detail panel for editing
 * name, description, and phase configurations. Supports CRUD operations,
 * duplication, and sending phase prompts to the assistant widget.
 */

import { Copy, Save, Trash2 } from 'lucide-react';

import { Button, Input, Label, ScrollArea, Text, Textarea } from '@ui';

import { PhaseSection } from '../PhaseSection';
import { WorkflowSidebar } from '../WorkflowSidebar';

import { useWorkflowEditor } from './useWorkflowEditor';

export function WorkflowEditor() {
  const {
    selectedTemplateId,
    setSelectedTemplateId,
    templates,
    artifacts,
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
  } = useWorkflowEditor();

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
