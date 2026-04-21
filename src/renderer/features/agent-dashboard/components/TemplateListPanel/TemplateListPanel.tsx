/**
 * TemplateListPanel — Browse, select, and manage workflow templates
 *
 * Shows all templates with name, description, mode badge, and CRUD actions.
 */

import { Copy, Pencil, Play, Plus, Trash2 } from 'lucide-react';

import type { WorkflowTemplate } from '@shared/ipc/workflow-templates/schemas';

import { cn } from '@renderer/shared/lib/utils';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
  Spinner,
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ui';

import { useTemplateListPanel } from './useTemplateListPanel';

// ─── Mode badge variant map ──────────────────────────────────

type ModeBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const MODE_BADGE_VARIANT: Record<WorkflowTemplate['mode'], ModeBadgeVariant> = {
  standard: 'default',
  'fast-prototype': 'secondary',
  research: 'outline',
  'pr-review': 'destructive',
};

const MODE_LABEL: Record<WorkflowTemplate['mode'], string> = {
  standard: 'Standard',
  'fast-prototype': 'Fast',
  research: 'Research',
  'pr-review': 'PR Review',
};

// ─── Component ───────────────────────────────────────────────

export function TemplateListPanel() {
  const {
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
  } = useTemplateListPanel();

  function renderBody() {
    if (isLoading) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Spinner size="sm" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Text size="sm" variant="muted">
            Failed to load templates
          </Text>
        </div>
      );
    }

    const list = templates ?? [];
    const isEmpty = list.length === 0;

    if (isEmpty) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Text size="sm" variant="muted">
            No templates yet. Create one to get started.
          </Text>
        </div>
      );
    }

    return (
      <div aria-label="Workflow templates" className="space-y-2 p-1">
        {list.map((template) => {
          const isDeleting =
            deleteTemplate.isPending && deleteTemplate.variables === template.id;
          const isDuplicatingVars = duplicateTemplate.variables as { id: string } | undefined;
          const isDuplicating =
            duplicateTemplate.isPending && isDuplicatingVars?.id === template.id;
          return (
            <TemplateRow
              key={template.id}
              isDeleting={isDeleting}
              isDuplicating={isDuplicating}
              isSelected={selectedTemplateId === template.id}
              template={template}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onEdit={handleEdit}
              onKeyDown={handleKeyDown}
              onLaunch={handleLaunch}
              onSelect={handleSelect}
            />
          );
        })}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="flex h-full flex-col">
        <CardHeader className="shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Workflow configuration presets</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => openEditor(null)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-full">{renderBody()}</ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ─── TemplateRow ─────────────────────────────────────────────

interface TemplateRowProps {
  template: WorkflowTemplate;
  isSelected: boolean;
  isDeleting: boolean;
  isDuplicating: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onLaunch: (id: string) => void;
  onKeyDown: (event: React.KeyboardEvent, id: string) => void;
}

function TemplateRow({
  template,
  isSelected,
  isDeleting,
  isDuplicating,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onLaunch,
  onKeyDown,
}: TemplateRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-accent/30',
      )}
      onClick={() => onSelect(template.id)}
      onKeyDown={(e) => onKeyDown(e, template.id)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{template.name}</span>
          <Badge className="shrink-0 text-xs" variant={MODE_BADGE_VARIANT[template.mode]}>
            {MODE_LABEL[template.mode]}
          </Badge>
          {template.isBuiltin ? (
            <Badge className="shrink-0 text-xs" variant="outline">
              Built-in
            </Badge>
          ) : null}
        </div>
        {template.description.length > 0 ? (
          <Text className="mt-0.5 line-clamp-2" size="sm" variant="muted">
            {template.description}
          </Text>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={`Launch ${template.name}`}
              className="h-7 w-7"
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch(template.id);
              }}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Launch</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={`Edit ${template.name}`}
              className="h-7 w-7"
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template.id);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={`Duplicate ${template.name}`}
              className="h-7 w-7"
              disabled={isDuplicating}
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(template.id);
              }}
            >
              {isDuplicating ? <Spinner size="sm" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate</TooltipContent>
        </Tooltip>

        {template.isBuiltin ? null : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={`Delete ${template.name}`}
                className="h-7 w-7 text-destructive hover:text-destructive"
                disabled={isDeleting}
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(template.id);
                }}
              >
                {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
