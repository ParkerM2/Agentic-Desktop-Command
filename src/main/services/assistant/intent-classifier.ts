/**
 * Intent Classifier — Thin re-export
 *
 * Implementation split into intent-classifier/ directory.
 * This file preserves the original import path for consumers.
 */

export { classifyIntent, classifyIntentAsync } from './intent-classifier/index';
export type { ClassifiedIntent, IntentRule } from './intent-classifier/index';
