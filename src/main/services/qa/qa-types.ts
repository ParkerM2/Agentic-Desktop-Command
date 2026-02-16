/**
 * QA System Types
 *
 * Types for the two-tier automated QA system: quiet (background) and full (interactive).
 */

// ─── QA Mode ────────────────────────────────────────────────

export type QaMode = 'quiet' | 'full';

// ─── QA Session ─────────────────────────────────────────────

export type QaSessionStatus = 'building' | 'launching' | 'testing' | 'completed' | 'error';

export interface QaSession {
  id: string;
  taskId: string;
  mode: QaMode;
  status: QaSessionStatus;
  startedAt: string;
  completedAt?: string;
  report?: QaReport;
  screenshots: string[];
  agentSessionId?: string;
}

// ─── QA Report ──────────────────────────────────────────────

export type QaResult = 'pass' | 'fail' | 'warnings';

export type VerificationResult = 'pass' | 'fail';

export interface VerificationSuite {
  lint: VerificationResult;
  typecheck: VerificationResult;
  test: VerificationResult;
  build: VerificationResult;
  docs: VerificationResult;
}

export interface QaReport {
  result: QaResult;
  checksRun: number;
  checksPassed: number;
  issues: QaIssue[];
  verificationSuite: VerificationSuite;
  screenshots: QaScreenshot[];
  duration: number;
}

// ─── QA Issue ───────────────────────────────────────────────

export type QaIssueSeverity = 'critical' | 'major' | 'minor' | 'cosmetic';

export interface QaIssue {
  severity: QaIssueSeverity;
  category: string;
  description: string;
  screenshot?: string;
  location?: string;
}

// ─── QA Screenshot ──────────────────────────────────────────

export interface QaScreenshot {
  label: string;
  path: string;
  timestamp: string;
  annotated: boolean;
}

// ─── QA Context ─────────────────────────────────────────────

export interface QaContext {
  projectPath: string;
  changedFiles: string[];
  taskDescription: string;
  planContent?: string;
}

// ─── QA Runner Interface ────────────────────────────────────

export type QaSessionEventType = 'started' | 'progress' | 'completed' | 'error';

export interface QaSessionEvent {
  type: QaSessionEventType;
  session: QaSession;
  timestamp: string;
  step?: string;
  total?: number;
  current?: number;
}

export type QaSessionEventHandler = (event: QaSessionEvent) => void;

export interface QaRunner {
  startQuiet: (taskId: string, context: QaContext) => Promise<QaSession>;
  startFull: (taskId: string, context: QaContext) => Promise<QaSession>;
  getSession: (sessionId: string) => QaSession | undefined;
  getSessionByTaskId: (taskId: string) => QaSession | undefined;
  getReportForTask: (taskId: string) => QaReport | undefined;
  cancel: (sessionId: string) => void;
  onSessionEvent: (handler: QaSessionEventHandler) => void;
  dispose: () => void;
}
