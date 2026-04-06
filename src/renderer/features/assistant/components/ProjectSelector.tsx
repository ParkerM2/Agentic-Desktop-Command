/**
 * ProjectSelector — Compact dropdown for picking the assistant's target project
 *
 * Shows the currently selected project name with a chevron.
 * Dropdown lists all projects in the layout store's tab order,
 * plus any other projects from the full project list.
 */

import { useMemo } from 'react';

import { ChevronDown, Circle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { useProjects } from '@features/projects/api/useProjects';

import { Button } from '@ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu';

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string, projectName: string) => void;
}

export function ProjectSelector({ selectedProjectId, onSelect }: ProjectSelectorProps) {
  const projectTabOrder = useLayoutStore((s) => s.projectTabOrder);
  const { data: projects } = useProjects();

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    if (projects) {
      for (const p of projects) {
        map.set(p.id, p.name);
      }
    }
    return map;
  }, [projects]);

  // Show tab-order projects first, then any remaining
  const orderedProjects = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string; inTabs: boolean }> = [];

    for (const id of projectTabOrder) {
      const name = projectMap.get(id);
      if (name) {
        result.push({ id, name, inTabs: true });
        seen.add(id);
      }
    }

    for (const [id, name] of projectMap) {
      if (!seen.has(id)) {
        result.push({ id, name, inTabs: false });
      }
    }

    return result;
  }, [projectTabOrder, projectMap]);

  const selectedName = selectedProjectId ? (projectMap.get(selectedProjectId) ?? 'Project') : 'No project';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Select project"
          className="h-6 max-w-28 gap-1 px-1.5 text-[10px] font-medium"
          size="sm"
          variant="ghost"
        >
          <span className="truncate">{selectedName}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-48 w-48 overflow-y-auto">
        {orderedProjects.length === 0 ? (
          <DropdownMenuItem disabled>No projects</DropdownMenuItem>
        ) : (
          orderedProjects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              className="gap-2 text-xs"
              onClick={() => onSelect(p.id, p.name)}
            >
              <Circle
                className={cn(
                  'h-2 w-2 shrink-0',
                  p.inTabs ? 'fill-green-500 text-green-500' : 'fill-muted text-muted',
                )}
              />
              <span className={cn('truncate', selectedProjectId === p.id && 'font-medium')}>
                {p.name}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
