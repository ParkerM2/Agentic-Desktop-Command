/**
 * VoiceSettings — Configuration panel for voice input/output
 *
 * Allows users to enable/disable voice, select language, and choose input mode.
 */

import { Mic, MicOff, Volume2 } from 'lucide-react';

import { VOICE_LANGUAGES } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
} from '@ui';

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
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
      </div>
    );
  }

  function handleToggleEnabled() {
    if (config === undefined) return;
    updateConfig.mutate({ enabled: !config.enabled });
  }

  function handleLanguageChange(value: string) {
    updateConfig.mutate({ language: value });
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
          <Label className="text-foreground text-sm font-medium" htmlFor="voice-enabled">
            Voice Input
          </Label>
          <p className="text-muted-foreground text-xs">Enable voice commands and dictation</p>
        </div>
        <Switch
          checked={config.enabled}
          id="voice-enabled"
          onCheckedChange={handleToggleEnabled}
        />
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
        <Label className="text-foreground text-sm font-medium" htmlFor="voice-language">
          Language
        </Label>
        <Select
          disabled={!config.enabled}
          value={config.language}
          onValueChange={handleLanguageChange}
        >
          <SelectTrigger id="voice-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Input Mode Selection */}
      <div className="space-y-2">
        <span className="text-foreground text-sm font-medium">Input Mode</span>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!config.enabled}
            type="button"
            variant={config.inputMode === 'push_to_talk' ? 'primary' : 'outline'}
            onClick={() => handleInputModeChange('push_to_talk')}
          >
            <Mic className="h-4 w-4" />
            Push to Talk
          </Button>
          <Button
            className="flex-1"
            disabled={!config.enabled}
            type="button"
            variant={config.inputMode === 'continuous' ? 'primary' : 'outline'}
            onClick={() => handleInputModeChange('continuous')}
          >
            <Mic className="h-4 w-4" />
            Continuous
          </Button>
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
            <Button
              disabled={isSpeaking}
              type="button"
              variant="secondary"
              onClick={handleTestVoice}
            >
              <Volume2 className="h-4 w-4" />
              Test Voice
            </Button>
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
