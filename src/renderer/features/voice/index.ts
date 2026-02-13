/**
 * Voice feature — public API
 */

// API hooks
export { useVoiceConfig, useUpdateVoiceConfig, useVoicePermission } from './api/useVoice';
export { voiceKeys } from './api/queryKeys';

// Components
export { VoiceButton } from './components/VoiceButton';
export type { VoiceButtonProps } from './components/VoiceButton';
export { VoiceSettings } from './components/VoiceSettings';
export type { VoiceSettingsProps } from './components/VoiceSettings';

// Hooks
export { useSpeechRecognition } from './hooks/useSpeechRecognition';
export type {
  SpeechRecognitionState,
  SpeechRecognitionControls,
  UseSpeechRecognitionOptions,
} from './hooks/useSpeechRecognition';

export { useSpeechSynthesis, findVoice, getDefaultVoice } from './hooks/useSpeechSynthesis';
export type {
  SpeechSynthesisState,
  SpeechSynthesisControls,
  SpeakOptions,
} from './hooks/useSpeechSynthesis';
