/**
 * Test Suite types
 */

export type QaRunStatus = 'running' | 'passed' | 'failed' | 'cancelled';

export interface QaStepNavigate {
  type: 'navigate';
  url: string;
}

export interface QaStepClick {
  type: 'click';
  selector: string;
  context?: StepContext;
}

export interface QaStepFill {
  type: 'fill';
  selector: string;
  value: string;
  context?: StepContext;
}

export interface QaStepSelect {
  type: 'select';
  selector: string;
  value: string;
  context?: StepContext;
}

export interface QaStepPress {
  type: 'press';
  key: string;
}

export interface QaStepWait {
  type: 'wait';
  ms: number;
}

export interface QaStepAssert {
  type: 'assert';
  selector: string;
  expected: string;
}

export interface StepContext {
  text?: string;        // innerText/textContent, truncated to 80 chars
  label?: string;       // aria-label or associated label text
  placeholder?: string; // input placeholder
  tagName: string;      // 'button', 'input', 'a', 'select', etc.
  inputType?: string;   // 'text', 'email', 'password' (inputs only)
}

export type TestSuiteStep =
  | QaStepNavigate
  | QaStepClick
  | QaStepFill
  | QaStepSelect
  | QaStepPress
  | QaStepWait
  | QaStepAssert;

export interface QaScript {
  id: string;
  name: string;
  description?: string;
  steps: TestSuiteStep[];
  createdAt: string;
  updatedAt: string;
}

export interface QaRun {
  id: string;
  scriptId: string;
  status: QaRunStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy: 'manual' | 'scheduled' | 'ci';
  outputLines: string[];
  screenshots: string[];
  error?: string;
}

export interface QaRunReport {
  runId: string;
  scriptId: string;
  status: QaRunStatus;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  duration: number;
  screenshots: string[];
  outputLines: string[];
  startedAt: string;
  completedAt?: string;
}
