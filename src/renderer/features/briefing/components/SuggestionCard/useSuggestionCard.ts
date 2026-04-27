/**
 * useSuggestionCard — all logic for SuggestionCard
 */

import { useNavigate } from '@tanstack/react-router';

import { ROUTES, ROUTE_PATTERNS } from '@shared/constants';
import type { Suggestion } from '@shared/types';

interface UseSuggestionCardParams {
  suggestion: Suggestion;
}

export function useSuggestionCard({ suggestion }: UseSuggestionCardParams) {
  const navigate = useNavigate();

  function handleAction(): void {
    if (suggestion.action === undefined) return;

    const { targetId, targetType } = suggestion.action;
    if (targetId === undefined) return;

    if (targetType === 'project') {
      void navigate({ to: ROUTE_PATTERNS.PROJECT_TASKS, params: { projectId: targetId } });
    } else if (targetType === 'task') {
      void navigate({ to: ROUTES.MY_WORK });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAction();
    }
  }

  return {
    handleAction,
    handleKeyDown,
  };
}
