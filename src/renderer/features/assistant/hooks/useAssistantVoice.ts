/**
 * useAssistantVoice — Voice mode abstraction for the assistant widget
 *
 * Wraps useSpeechRecognition with mode switching, auto-send on silence,
 * and transcript → assistant command pipeline. Provides a clean interface
 * that allows adding wake word detection later without changing the widget.
 */

import { useCallback, useEffect, useRef } from 'react';

import type { VoiceInputMode } from '@shared/types';

import { useSpeechRecognition, useVoiceConfig } from '@features/voice';

// ─── Types ──────────────────────────────────────────────────

export type VoiceMode = 'off' | 'push_to_talk' | 'continuous';

export interface UseAssistantVoiceReturn {
  mode: VoiceMode;
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const SILENCE_TIMEOUT_MS = 1500;

// ─── Hook ───────────────────────────────────────────────────

export function useAssistantVoice(
  onCommand: (text: string) => void,
): UseAssistantVoiceReturn {
  const { data: voiceConfig } = useVoiceConfig();
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef('');

  const mode: VoiceMode = voiceConfig?.enabled === true
    ? mapInputMode(voiceConfig.inputMode)
    : 'off';

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    start,
    stop,
    resetTranscript,
  } = useSpeechRecognition({
    language: voiceConfig?.language ?? 'en-US',
    continuous: mode === 'continuous',
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        lastTranscriptRef.current = text;
        resetSilenceTimer();
      }
    },
  });

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();

    silenceTimerRef.current = setTimeout(() => {
      // Auto-send on silence: if we have a transcript, send it
      const finalText = lastTranscriptRef.current.trim();
      if (finalText.length > 0) {
        onCommand(finalText);
        lastTranscriptRef.current = '';
        resetTranscript();
      }
      // Stop listening in push-to-talk mode after auto-send
      if (mode === 'push_to_talk') {
        stop();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer, mode, onCommand, resetTranscript, stop]);

  // Clean up silence timer on unmount
  useEffect(() => clearSilenceTimer, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (mode === 'off') return;
    lastTranscriptRef.current = '';
    resetTranscript();
    start();
  }, [mode, resetTranscript, start]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    stop();

    // Send any accumulated transcript when manually stopped
    const finalText = lastTranscriptRef.current.trim();
    if (finalText.length > 0) {
      onCommand(finalText);
      lastTranscriptRef.current = '';
      resetTranscript();
    }
  }, [clearSilenceTimer, onCommand, resetTranscript, stop]);

  return {
    mode,
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
  };
}

// ─── Helpers ────────────────────────────────────────────────

function mapInputMode(inputMode: VoiceInputMode): VoiceMode {
  switch (inputMode) {
    case 'push_to_talk':
      return 'push_to_talk';
    case 'continuous':
      return 'continuous';
  }
}
