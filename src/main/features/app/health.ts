/**
 * App — Health sub-module barrel
 */

export { createErrorCollector } from './health/error-collector';
export { createHealthRegistry } from './health/health-registry';
export { createHealthService } from './health/health-service';
export { registerErrorHandlers } from './health/error-handlers';

export type { ErrorCollector, ErrorCollectorCallbacks, ErrorReportInput } from './health/error-collector';
export type { HealthRegistry, HealthRegistryCallbacks } from './health/health-registry';
export type { HealthService, MemoryStats } from './health/health-service';
export type { ErrorCollectorHandler, HealthRegistryHandler } from './health/error-handlers';
