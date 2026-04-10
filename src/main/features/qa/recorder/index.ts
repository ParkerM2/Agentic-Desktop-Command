/**
 * QA Recorder Service — Factory
 *
 * Composes script store, runner, and exporter into a single service object.
 */

import { createExporter } from './exporter';
import { createRunner } from './runner';
import { createScriptStore } from './script-store';

import type { QaExporter } from './exporter';
import type { QaRunner } from './runner';
import type { ScriptStore } from './script-store';
import type { AdcDatabase } from '../../../db';

export interface QaRecorderService {
  scriptStore: ScriptStore;
  runner: QaRunner;
  exporter: QaExporter;
}

export function createQaRecorderService(db: AdcDatabase): QaRecorderService {
  return {
    scriptStore: createScriptStore(db),
    runner: createRunner(db),
    exporter: createExporter(),
  };
}
