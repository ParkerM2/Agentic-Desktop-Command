/**
 * Settings-related types
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AgentSettings {
  maxConcurrentAgents: number;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

export interface AppSettings {
  theme: ThemeMode;
  colorTheme: string;
  customThemes?: CustomTheme[];
  language: string;
  uiScale: number;
  onboardingCompleted: boolean;
  seenVersionWarnings?: string[];
  fontFamily?: string;
  fontSize?: number;
  anthropicApiKey?: string;
  agentSettings?: AgentSettings;
  hotkeys?: Record<string, string>;
  openAtLogin?: boolean;
  minimizeToTray?: boolean;
  startMinimized?: boolean;
  keepRunning?: boolean;
  logLevel?: LogLevel;
}

export interface CustomTheme {
  id: string;
  name: string;
  css: string;
}

export interface Profile {
  id: string;
  name: string;
  apiKey?: string;
  model?: string;
  configDir?: string;
  oauthToken?: string;
  isDefault: boolean;
}
