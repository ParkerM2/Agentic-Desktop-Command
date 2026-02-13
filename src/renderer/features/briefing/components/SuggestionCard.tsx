/**
 * SuggestionCard — Display a proactive suggestion with action
 */

import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, GitBranch, Layers, Zap } from 'lucide-react';

import type { Suggestion, SuggestionType } from '@shared/types';

const SUGGESTION_ICONS: Record<SuggestionType, React.ElementType> = {
  stale_project: GitBranch,
  parallel_tasks: Layers,
  blocked_task: AlertCircle,
};

const SUGGESTION_COLORS: Record<SuggestionType, string> = {
  stale_project: 'text-muted-foreground',
  parallel_tasks: 'text-info',
  blocked_task: 'text-warning',
};

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const navigate = useNavigate();
  const IconComponent = SUGGESTION_ICONS[suggestion.type];
  const iconColor = SUGGESTION_COLORS[suggestion.type];

  function handleAction(): void {
    if (suggestion.action === undefined) return;

    const { targetId, targetType } = suggestion.action;
    if (targetId === undefined) return;

    if (targetType === 'project') {
      void navigate({ to: '/projects/$projectId/kanban', params: { projectId: targetId } });
    } else if (targetType === 'task') {
      // Navigate to the task — for now, navigate to my-work which shows all tasks
      void navigate({ to: '/my-work' });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAction();
    }
  }

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${iconColor}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-foreground text-sm font-medium">{suggestion.title}</h4>
          <p className="text-muted-foreground mt-1 text-sm">{suggestion.description}</p>
          {suggestion.action === undefined ? null : (
            <button
              className="border-border bg-card text-foreground hover:bg-muted mt-3 inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
              type="button"
              onClick={handleAction}
              onKeyDown={handleKeyDown}
            >
              <Zap className="h-3 w-3" />
              {suggestion.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
