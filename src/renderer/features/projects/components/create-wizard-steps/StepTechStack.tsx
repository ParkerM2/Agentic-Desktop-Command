/**
 * StepTechStack — Wizard step for selecting tech stack frameworks
 */

import { cn } from '@renderer/shared/lib/utils';

import { Button, Heading } from '@ui';

const TECH_STACK_OPTIONS = [
  { category: 'Frontend', items: ['React', 'Vue', 'Next.js', 'Svelte'] },
  { category: 'Backend', items: ['Express', 'Fastify', 'NestJS'] },
  { category: 'Languages', items: ['Python', 'Rust', 'Go'] },
  { category: 'Styling', items: ['Tailwind CSS'] },
] as const;

interface StepTechStackProps {
  techStack: string[];
  onTechStackChange: (techStack: string[]) => void;
}

export function StepTechStack({ techStack, onTechStackChange }: StepTechStackProps) {
  function handleToggle(item: string) {
    if (techStack.includes(item)) {
      onTechStackChange(techStack.filter((t) => t !== item));
    } else {
      onTechStackChange([...techStack, item]);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Heading as="h3" className="text-sm font-medium">Tech Stack</Heading>
        <p className="text-muted-foreground mt-1 text-xs">
          Select the technologies this project will use. These hints help generate CLAUDE.md and
          documentation.
        </p>
      </div>

      {TECH_STACK_OPTIONS.map((group) => (
        <div key={group.category}>
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            {group.category}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => {
              const isSelected = techStack.includes(item);
              return (
                <Button
                  key={item}
                  aria-pressed={isSelected}
                  type="button"
                  variant="outline"
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
                  )}
                  onClick={() => handleToggle(item)}
                >
                  {item}
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      {techStack.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Selected: {techStack.join(', ')}
        </p>
      ) : null}
    </div>
  );
}
