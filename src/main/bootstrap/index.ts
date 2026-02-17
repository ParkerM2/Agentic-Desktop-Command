/**
 * Bootstrap barrel — re-exports all bootstrap modules.
 */

export { wireEventForwarding } from './event-wiring';
export { wireIpcHandlers } from './ipc-wiring';
export { setupLifecycle } from './lifecycle';
export { createServiceRegistry } from './service-registry';

export type { ServiceRegistryResult } from './service-registry';
export type { LifecycleDeps } from './lifecycle';
