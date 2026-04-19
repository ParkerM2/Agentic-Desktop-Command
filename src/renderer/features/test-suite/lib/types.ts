/**
 * Shared types for the test-suite feature renderer layer.
 */

/** Output line with sequential ID for store-based rendering */
export interface StoreOutputLine {
  id: number;
  text: string;
}

/** Output line from IPC event stream */
export interface StreamOutputLine {
  line: string;
  timestamp: string;
}

/** Run record shape used by results/output components */
export interface RunRecord {
  id?: string;
  scriptId?: string;
  status: string;
  triggeredBy?: string;
  startedAt?: string;
  completedAt?: string;
  outputLines?: string[];
  screenshots?: string[];
  error?: string;
  stepsPassed?: number;
  stepsFailed?: number;
  durationMs?: number;
  reportPath?: string;
}
