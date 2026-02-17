/**
 * Command Executor — Thin wrapper
 *
 * Routes classified intents to the appropriate domain executor
 * via the executor router. All logic lives in `./executors/`.
 *
 * Preserves the original public API: CommandExecutor, CommandExecutorDeps,
 * and createCommandExecutor factory.
 */

import type { AssistantContext, AssistantResponse } from '@shared/types';

import { routeIntent } from './executors/router';

import type { CommandExecutorDeps } from './executors/types';
import type { ClassifiedIntent } from './intent-classifier';

export type { CommandExecutorDeps } from './executors/types';

export interface CommandExecutor {
  /** Execute a classified intent and return a response. Never throws. */
  execute: (intent: ClassifiedIntent, context?: AssistantContext) => Promise<AssistantResponse>;
}

export function createCommandExecutor(deps: CommandExecutorDeps): CommandExecutor {
  return {
    execute: (intent, context) => routeIntent(intent, context, deps),
  };
}
