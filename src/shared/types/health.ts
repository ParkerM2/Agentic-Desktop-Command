/**
 * Error tracking and service health monitoring types.
 * Used by the crash-resilience system across main and renderer processes.
 */

/** Severity level of a collected error */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/** Tier determines which error boundary catches the error */
export type ErrorTier = 'app' | 'project' | 'personal';

/** Category groups errors by subsystem origin */
export type ErrorCategory =
  | 'connection'
  | 'filesystem'
  | 'service'
  | 'agent'
  | 'ipc'
  | 'renderer'
  | 'general';

/** Contextual information captured at the time of error */
export interface ErrorContext {
  route?: string;
  routeHistory?: string[];
  projectId?: string;
  projectName?: string;
  task?: {
    id: string;
    title: string;
  };
  agent?: {
    id: string;
    name: string;
  };
}

/** A single error entry in the error log */
export interface ErrorEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  tier: ErrorTier;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context: ErrorContext;
}

/** Aggregated error statistics */
export interface ErrorStats {
  total: number;
  byTier: Record<ErrorTier, number>;
  bySeverity: Record<ErrorSeverity, number>;
  last24h: number;
}

/** Health status of an individual service */
export type ServiceHealthStatus = 'healthy' | 'unhealthy' | 'stopped';

/** Health snapshot for a single monitored service */
export interface ServiceHealth {
  name: string;
  status: ServiceHealthStatus;
  lastPulse: string;
  missedCount: number;
}

/** Aggregate health status for all monitored services */
export interface HealthStatus {
  services: ServiceHealth[];
}
