/**
 * Watch executor — handles watch creation, removal, and listing.
 */

import type { AssistantResponse } from '@shared/types';

import { buildActionResponse, buildErrorResponse, buildTextResponse } from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';

function handleWatchCreate(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.watchStore) {
    return buildErrorResponse('Watch system is not available.');
  }

  const targetId = intent.extractedEntities.targetId || '';
  const conditionText = intent.extractedEntities.condition || 'changes';
  const followUp = intent.extractedEntities.followUp || '';

  if (targetId.length === 0) {
    return buildErrorResponse(
      'Please specify a task to watch (e.g. "tell me when task 123 is done").',
    );
  }

  const conditionMap: Record<
    string,
    { field: string; operator: 'equals' | 'changes'; value?: string }
  > = {
    done: { field: 'status', operator: 'equals', value: 'done' },
    error: { field: 'status', operator: 'equals', value: 'error' },
    changes: { field: 'status', operator: 'changes' },
  };

  const condition = conditionMap[conditionText] ?? conditionMap.changes;

  const watch = deps.watchStore.add({
    type: conditionText === 'error' ? 'agent_error' : 'task_status',
    targetId,
    condition,
    action: 'notify',
    followUp: followUp.length > 0 ? followUp : undefined,
  });

  const conditionLabelMap: Record<string, string> = {
    done: 'is done',
    error: 'encounters an error',
    changes: 'changes status',
  };
  const conditionLabel = conditionLabelMap[conditionText] ?? 'changes status';
  const followUpNote = watch.followUp ? ` You said: "${watch.followUp}"` : '';
  return buildActionResponse(
    `Got it. I'll notify you when task #${targetId} ${conditionLabel}.${followUpNote}`,
    intent,
    'watch_create',
  );
}

function handleWatchRemove(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.watchStore) {
    return buildErrorResponse('Watch system is not available.');
  }

  const targetId = intent.extractedEntities.targetId || '';

  if (targetId.length === 0) {
    // Remove all watches
    deps.watchStore.clear();
    return buildActionResponse('All watches removed.', intent, 'watch_remove');
  }

  const active = deps.watchStore.getActive();
  const toRemove = active.filter((w) => w.targetId === targetId);

  if (toRemove.length === 0) {
    return buildTextResponse(`No active watches found for task #${targetId}.`);
  }

  for (const w of toRemove) {
    deps.watchStore.remove(w.id);
  }

  return buildActionResponse(
    `Stopped watching task #${targetId} (${String(toRemove.length)} watch${toRemove.length > 1 ? 'es' : ''} removed).`,
    intent,
    'watch_remove',
  );
}

function handleWatchList(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.watchStore) {
    return buildErrorResponse('Watch system is not available.');
  }

  const active = deps.watchStore.getActive();

  if (active.length === 0) {
    return buildTextResponse("You don't have any active watches.");
  }

  const lines = active.map((w) => {
    const conditionLabel =
      w.condition.operator === 'equals'
        ? `${w.condition.field} = ${w.condition.value ?? '?'}`
        : `${w.condition.field} changes`;
    return `- Task #${w.targetId}: ${conditionLabel}`;
  });

  return buildActionResponse(
    `Active watches (${String(active.length)}):\n${lines.join('\n')}`,
    intent,
    'watch_list',
  );
}

export function executeWatch(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  const subtype = intent.subtype ?? '';
  switch (subtype) {
    case 'create':
      return handleWatchCreate(intent, deps);
    case 'remove':
      return handleWatchRemove(intent, deps);
    case 'list':
      return handleWatchList(intent, deps);
    default:
      return buildTextResponse(
        'I understood that as a watch command, but could not determine the action.',
      );
  }
}
