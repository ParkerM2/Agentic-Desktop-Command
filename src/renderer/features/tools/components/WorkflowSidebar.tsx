/**
 * WorkflowSidebar — Template list sidebar for the workflow editor
 *
 * Displays all workflow templates in a scrollable list with selection state.
 * Plus button at the top to create new templates.
 */

import { Plus } from 'lucide-react';

import type { WorkflowTemplate } from '@shared/ipc/workflow-templates/schemas';

import { cn } from '@renderer/shared/lib/utils';

import { Button, ScrollArea, Text } from '@ui';

interface WorkflowSidebarProps {
  templates: WorkflowTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function WorkflowSidebar({
  templates,
  selectedId,
  onSelect,
  onNew,
}: WorkflowSidebarProps) {
  return (
    <div className="border-border flex h-full w-56 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between px-3 py-2">
        <Text className="text-sm font-medium">Workflows</Text>
        <Button className="h-7 w-7" size="icon" variant="ghost" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {templates.map((template) => (
            <Button
              key={template.id}
              size="sm"
              variant="ghost"
              className={cn(
                'h-auto justify-start px-2 py-1.5 text-left',
                template.id === selectedId
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
              onClick={() => onSelect(template.id)}
            >
              <Text className="truncate text-sm">{template.name}</Text>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
