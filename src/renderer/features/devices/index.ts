/**
 * Devices feature — public API
 */

// API hooks
export { useDevices, useRegisterDevice, useUpdateDevice } from './api/useDevices';
export { deviceKeys } from './api/queryKeys';

// Events
export { useDeviceEvents } from './hooks/useDeviceEvents';

// Store
export { useDeviceStore } from './store';
