/**
 * Settings Defaults — Default values and initial configuration
 */

import type { AgentSettings, AppSettings, Profile } from '@shared/types';

export interface SettingsFile {
  settings: AppSettings;
  profiles: Profile[];
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  maxConcurrentAgents: 2,
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  colorTheme: 'default',
  language: 'en',
  uiScale: 100,
  onboardingCompleted: false,
  agentSettings: DEFAULT_AGENT_SETTINGS,
};

export const DEFAULT_PROFILES: Profile[] = [{ id: 'default', name: 'Default', isDefault: true }];
