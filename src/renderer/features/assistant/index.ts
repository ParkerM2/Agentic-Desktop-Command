/**
 * Assistant feature — public API
 */

// Components
export { AssistantPage } from './components/AssistantPage';
export { AssistantWidget } from './components/AssistantWidget';

// Store
export { useAssistantStore } from './store';
export type { ResponseEntry } from './store';

// API
export { assistantKeys } from './api/queryKeys';
export { useHistory, useSendCommand, useClearHistory } from './api/useAssistant';

// Events
export { useAssistantEvents } from './hooks/useAssistantEvents';
