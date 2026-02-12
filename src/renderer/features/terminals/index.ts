/**
 * Terminals feature — public API
 */

export { useTerminals, useCreateTerminal, useCloseTerminal } from './api/useTerminals';
export { terminalKeys } from './api/queryKeys';
export { useTerminalEvents } from './hooks/useTerminalEvents';
export { useTerminalUI } from './store';
export { TerminalGrid } from './components/TerminalGrid';
