/**
 * Window IPC -- Barrel Export
 *
 * Re-exports all window-related schemas and contract definitions.
 */

export { WindowEmptyInputSchema, WindowIsMaximizedOutputSchema } from './schemas';

export { windowInvoke } from './contract';
