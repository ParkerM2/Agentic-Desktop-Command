/**
 * QuickActions — Common action buttons for the assistant
 */

import { Bell, Lightbulb, StickyNote } from 'lucide-react';

import { Button } from '@ui';

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  command: string;
}

const quickActions: QuickAction[] = [
  {
    label: 'New Note',
    icon: StickyNote,
    command: "Create a new note titled 'Quick Note' with today's date. Use the create_note tool.",
  },
  {
    label: 'New Idea',
    icon: Lightbulb,
    command:
      'Create a new feature idea for my project. Use the create_idea tool with a descriptive title and description.',
  },
  {
    label: 'Plan Today',
    icon: Bell,
    command:
      "Add a productive goal for today to my daily planner. Use the add_daily_goal tool with today's date.",
  },
];

interface QuickActionsProps {
  onAction: (command: string) => void;
  disabled?: boolean;
}

export function QuickActions({ disabled, onAction }: QuickActionsProps) {
  return (
    <div className="border-border border-b px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            className="text-muted-foreground text-xs"
            disabled={disabled}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onAction(action.command)}
          >
            <action.icon className="h-3.5 w-3.5" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
