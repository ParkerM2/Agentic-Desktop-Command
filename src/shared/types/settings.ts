/**
 * Settings-related types
 */

import type { DataRetentionSettings } from './data-management';
import type { SidebarLayoutId } from './layout';
import type { SecuritySettings } from './security';

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
  sidebarLayout?: SidebarLayoutId;
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
  securitySettings?: SecuritySettings;
  dataRetention?: DataRetentionSettings;
}

/** All CSS variable tokens that make up a color theme */
export interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  'sidebar-foreground': string;
  popover: string;
  'popover-foreground': string;
  success: string;
  'success-foreground': string;
  warning: string;
  'warning-foreground': string;
  info: string;
  'info-foreground': string;
  error: string;
  'error-light': string;
  'success-light': string;
  'warning-light': string;
  'info-light': string;
  'shadow-focus': string;
}

/** A saved custom theme with light and dark palettes */
export interface CustomTheme {
  id: string;
  name: string;
  light: ThemeTokens;
  dark: ThemeTokens;
  createdAt: string;
  updatedAt: string;
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
