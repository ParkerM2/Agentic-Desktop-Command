/**
 * Settings-related types
 */

export type ThemeMode = 'light' | 'dark' | 'system';

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
