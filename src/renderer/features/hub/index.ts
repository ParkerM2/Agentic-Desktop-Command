/**
 * Hub Setup feature — public API
 */

export { HubSetupPage } from './components/HubSetupPage';
export { validateHubUrl } from './lib/validateHubUrl';

export { hubDiscoveryKeys, useHubDiscovery } from './api/useHubDiscovery';
export { useHubPair } from './api/useHubPair';
export { useHubSwitchActive } from './api/useHubSwitchActive';
export { useHubRemoveRecord } from './api/useHubRemoveRecord';
export { useHubManualPair } from './api/useHubManualPair';
