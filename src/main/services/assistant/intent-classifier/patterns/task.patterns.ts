/**
 * Task Patterns — create task, add task, build, implement, fix
 */

import { stripPrefix } from '../helpers';

import type { IntentRule } from '../types';

export const TASK_RULES: IntentRule[] = [
  {
    pattern: /^(create task|add task|build|implement|fix)\s/i,
    type: 'task_creation',
    subtype: 'task',
    action: 'create_task',
    confidence: 0.9,
    extractEntities: (input) => ({
      title: stripPrefix(input, /^(create task|add task)[:\s]?/i),
    }),
  },
];
