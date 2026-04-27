/**
 * useAppBehaviorSection — logic hook for AppBehaviorSection
 */

import { useAgentSettings, useSettings, useUpdateAgentSettings, useUpdateSettings } from '../../api/useSettings';

export function useAppBehaviorSection() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: agentSettings } = useAgentSettings();
  const updateAgentSettings = useUpdateAgentSettings();

  const openAtLogin = settings?.openAtLogin ?? false;
  const minimizeToTray = settings?.minimizeToTray ?? false;
  const startMinimized = settings?.startMinimized ?? false;
  const keepRunning = settings?.keepRunning ?? false;
  const maxConcurrentAgents = agentSettings?.maxConcurrentAgents ?? 5;

  function handleMaxConcurrentAgentsChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Math.min(20, Math.max(1, Number(event.target.value)));
    updateAgentSettings.mutate({ maxConcurrentAgents: value });
  }

  return {
    openAtLogin,
    minimizeToTray,
    startMinimized,
    keepRunning,
    maxConcurrentAgents,
    updateSettings,
    handleMaxConcurrentAgentsChange,
  };
}
