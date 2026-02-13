/**
 * Voice interface domain types
 */

/** Voice input mode */
export type VoiceInputMode = 'push_to_talk' | 'continuous';

/** Voice configuration stored in settings */
export interface VoiceConfig {
  enabled: boolean;
  language: string;
  inputMode: VoiceInputMode;
}

/** Voice recognition state */
export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
}

/** Available language for speech recognition */
export interface VoiceLanguage {
  code: string;
  name: string;
}

/** Common voice languages */
export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
];

/** Default voice configuration */
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: false,
  language: 'en-US',
  inputMode: 'push_to_talk',
};
