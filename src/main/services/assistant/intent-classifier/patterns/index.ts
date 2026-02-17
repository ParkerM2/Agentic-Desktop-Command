/**
 * Intent Patterns — Barrel export
 *
 * Aggregates all domain pattern rules in priority order.
 * First match wins, so order matters.
 */

import { CALENDAR_RULES } from './calendar.patterns';
import { DEVICE_RULES } from './device.patterns';
import { EMAIL_RULES } from './email.patterns';
import { FITNESS_RULES } from './fitness.patterns';
import { GITHUB_RULES } from './github.patterns';
import { MISC_RULES } from './misc.patterns';
import { NOTES_RULES } from './notes.patterns';
import { PLANNER_RULES } from './planner.patterns';
import { QUICKCMD_RULES } from './quickcmd.patterns';
import { SPOTIFY_RULES } from './spotify.patterns';
import { TASK_RULES } from './task.patterns';
import { WATCH_RULES } from './watch.patterns';

import type { IntentRule } from '../types';

/**
 * All intent rules in priority order.
 * Watch and device patterns first (most specific),
 * then domain patterns, then generic quick commands last.
 */
export const ALL_INTENT_RULES: IntentRule[] = [
  ...WATCH_RULES,
  ...DEVICE_RULES,
  ...FITNESS_RULES,
  ...CALENDAR_RULES,
  ...NOTES_RULES,
  ...EMAIL_RULES,
  ...GITHUB_RULES,
  ...PLANNER_RULES,
  ...MISC_RULES,
  ...TASK_RULES,
  ...SPOTIFY_RULES,
  ...QUICKCMD_RULES,
];
