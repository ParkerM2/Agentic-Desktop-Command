/**
 * Error & Health IPC handlers
 *
 * Thin wrappers that delegate to ErrorCollector and HealthRegistry services.
 *
 * Uses local interfaces matching the IPC contract types rather than importing
 * the service's local types, since the service may define its own enums that
 * need to converge with the shared contract types.
 */

import type {
  ErrorContext,
  ErrorEntry,
  ErrorStats,
  HealthStatus,
} from '@shared/types/health';

import type { IpcRouter } from '../router';

/** Minimal ErrorCollector interface matching the IPC contract types */
export interface ErrorCollectorHandler {
  report: (input: {
    severity: ErrorEntry['severity'];
    tier: ErrorEntry['tier'];
    category: ErrorEntry['category'];
    message: string;
    stack?: string;
    context?: ErrorContext;
  }) => ErrorEntry;
  getLog: (since?: string) => ErrorEntry[];
  getStats: () => ErrorStats;
  clear: () => void;
}

/** Minimal HealthRegistry interface matching the IPC contract types */
export interface HealthRegistryHandler {
  getStatus: () => HealthStatus;
}

export function registerErrorHandlers(
  router: IpcRouter,
  errorCollector: ErrorCollectorHandler,
  healthRegistry: HealthRegistryHandler,
): void {
  router.handle('app.getErrorLog', ({ since }) =>
    Promise.resolve({ entries: errorCollector.getLog(since) }),
  );

  router.handle('app.getErrorStats', () => Promise.resolve(errorCollector.getStats()));

  router.handle('app.clearErrorLog', () => {
    errorCollector.clear();
    return Promise.resolve({ success: true as const });
  });

  router.handle('app.reportRendererError', (input) => {
    const context: ErrorContext = {
      route: input.route,
      routeHistory: input.routeHistory,
      projectId: input.projectId,
    };

    errorCollector.report({
      severity: input.severity,
      tier: input.tier,
      category: input.category,
      message: input.message,
      stack: input.stack,
      context,
    });

    return Promise.resolve({ success: true as const });
  });

  router.handle('app.getHealthStatus', () => Promise.resolve(healthRegistry.getStatus()));
}
