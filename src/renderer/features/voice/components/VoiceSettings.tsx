/**
 * VoiceSettings — Configuration panel for voice input/output
 *
 * Allows users to enable/disable voice, select language, and choose input mode.
 */

import { Mic, MicOff, Volume2 } from 'lucide-react';

import { VOICE_LANGUAGES } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useUpdateVoiceConfig, useVoiceConfig, useVoicePermission } from '../api/useVoice';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export interface VoiceSettingsProps {
  /** Additional CSS classes */
  className?: string;
}

export function VoiceSettings({ className }: VoiceSettingsProps) {
  const { data: config, isLoading: configLoading } = useVoiceConfig();
  const { data: permission } = useVoicePermission();
  const updateConfig = useUpdateVoiceConfig();
  const { voices, speak, isSpeaking, isSupported: synthesisSupported } = useSpeechSynthesis();

  if (configLoading || config === undefined) {
    return (
      <div className={cn('animate-pulse space-y-4', className)}>
        <div className="bg-muted h-10 rounded-md" />
        <div className="bg-muted h-10 rounded-md" />
        <div className="bg-muted h-10 rounded-md" />
      </div>
    );
  }

  function handleToggleEnabled() {
    if (config === undefined) return;
    updateConfig.mutate({ enabled: !config.enabled });
  }

  function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateConfig.mutate({ language: e.target.value });
  }

  function handleInputModeChange(mode: 'push_to_talk' | 'continuous') {
    updateConfig.mutate({ inputMode: mode });
  }

  function handleTestVoice() {
    speak('Hello! Voice synthesis is working correctly.', {
      lang: config?.language ?? 'en-US',
    });
  }

  const permissionGranted = permission?.granted ?? true;
  const showSynthesis = synthesisSupported;
  const showVoiceDetails = synthesisSupported && voices.length > 0;
  const filteredVoices = voices.filter((v) => v.lang.startsWith(config.language.split('-')[0]));

  return (
    <div className={cn('space-y-6', className)}>
      {/* Enable/Disable Voice */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label className="text-foreground text-sm font-medium" htmlFor="voice-enabled">
            Voice Input
          </label>
          <p className="text-muted-foreground text-xs">Enable voice commands and dictation</p>
        </div>
        <button
          aria-checked={config.enabled}
          id="voice-enabled"
          role="switch"
          type="button"
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full',
            'border-2 border-transparent transition-colors duration-200 ease-in-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            config.enabled ? 'bg-primary' : 'bg-muted',
          )}
          onClick={handleToggleEnabled}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full',
              'bg-background shadow ring-0 transition duration-200 ease-in-out',
              config.enabled ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {/* Permission Warning */}
      {permissionGranted ? null : (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          <div className="flex items-center gap-2">
            <MicOff className="h-4 w-4" />
            <span>Microphone permission required</span>
          </div>
          <p className="mt-1 text-xs opacity-80">
            Please allow microphone access in your system settings or browser.
          </p>
        </div>
      )}

      {/* Language Selection */}
      <div className="space-y-2">
        <label className="text-foreground text-sm font-medium" htmlFor="voice-language">
          Language
        </label>
        <select
          disabled={!config.enabled}
          id="voice-language"
          value={config.language}
          className={cn(
            'border-input bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm',
            'focus:border-primary focus:ring-primary focus:ring-1 focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          onChange={handleLanguageChange}
        >
          {VOICE_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Input Mode Selection */}
      <div className="space-y-2">
        <span className="text-foreground text-sm font-medium">Input Mode</span>
        <div className="flex gap-2">
          <button
            disabled={!config.enabled}
            type="button"
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm',
              'border transition-colors',
              config.inputMode === 'push_to_talk'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-foreground hover:bg-muted',
              !config.enabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => handleInputModeChange('push_to_talk')}
          >
            <Mic className="h-4 w-4" />
            Push to Talk
          </button>
          <button
            disabled={!config.enabled}
            type="button"
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm',
              'border transition-colors',
              config.inputMode === 'continuous'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-foreground hover:bg-muted',
              !config.enabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => handleInputModeChange('continuous')}
          >
            <Mic className="h-4 w-4" />
            Continuous
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          {config.inputMode === 'push_to_talk'
            ? 'Hold the microphone button to record'
            : 'Click once to start, click again to stop'}
        </p>
      </div>

      {/* Voice Synthesis Test */}
      {showSynthesis ? (
        <div className="space-y-2">
          <span className="text-foreground text-sm font-medium">Voice Output</span>
          <div className="flex items-center gap-3">
            <button
              disabled={isSpeaking}
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isSpeaking && 'cursor-not-allowed opacity-50',
              )}
              onClick={handleTestVoice}
            >
              <Volume2 className="h-4 w-4" />
              Test Voice
            </button>
            <span className="text-muted-foreground text-xs">{voices.length} voices available</span>
          </div>
        </div>
      ) : null}

      {/* Available Voices (collapsed by default) */}
      {showVoiceDetails ? (
        <details className="text-sm">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
            Show available voices ({voices.length})
          </summary>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {filteredVoices.map((voice) => (
              <div
                key={voice.voiceURI}
                className="text-muted-foreground flex items-center gap-2 text-xs"
              >
                <span className="font-medium">{voice.name}</span>
                <span className="opacity-60">({voice.lang})</span>
                {voice.default ? (
                  <span className="bg-primary/10 text-primary rounded px-1 text-xs">default</span>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
