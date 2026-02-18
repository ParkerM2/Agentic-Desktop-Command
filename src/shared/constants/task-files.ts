/**
 * Task spec file names and directory conventions.
 *
 * Tasks are stored as directories inside `<project>/.adc/specs/`.
 * Each task directory contains these JSON files.
 */

/** Root directory name for ADC configuration */
export const ADC_DIR = '.adc';

/** Subdirectory within .adc that holds task specs */
export const SPECS_DIR = 'specs';

/** Task description and workflow type */
export const REQUIREMENTS_FILENAME = 'requirements.json';

/** Status, phases, execution state */
export const PLAN_FILENAME = 'implementation_plan.json';

/** Model config, branch info, complexity */
export const METADATA_FILENAME = 'task_metadata.json';

/** Execution logs (optional) */
export const LOGS_FILENAME = 'task_logs.json';
