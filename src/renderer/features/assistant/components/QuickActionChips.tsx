/**
 * QuickActionChips — Small pill buttons that prefill the assistant input
 *
 * Each chip inserts a project-scoped command template into the input field.
 */

import { Button } from '@ui/button';

interface QuickActionChipsProps {
  projectName: string;
  onPrefill: (text: string) => void;
}

const chips = [
  { label: '+ Task', template: (name: string) => `add task for ${name}: ` },
  { label: '+ Todo', template: (name: string) => `add todo for ${name}: ` },
  { label: 'Status', template: (name: string) => `status of ${name}` },
  { label: 'Git', template: (name: string) => `git status for ${name}` },
  { label: 'PRs', template: (name: string) => `open PRs for ${name}` },
] as const;

export function QuickActionChips({ projectName, onPrefill }: QuickActionChipsProps) {
  return (
    <div className="flex flex-wrap gap-1 px-2 pb-1.5">
      {chips.map((chip) => (
        <Button
          key={chip.label}
          className="bg-muted hover:bg-accent text-muted-foreground h-5 rounded-full px-2 text-[10px]"
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => onPrefill(chip.template(projectName))}
        >
          {chip.label}
        </Button>
      ))}
    </div>
  );
}
