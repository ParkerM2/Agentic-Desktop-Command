/**
 * useSpeechSynthesis — React hook wrapping Web Speech Synthesis API
 *
 * Uses browser-native speechSynthesis.
 * Returns speaking state, available voices, and control functions.
 */

import { useCallback, useEffect, useState } from 'react';

export interface SpeechSynthesisState {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  error: string | null;
}

export interface SpeechSynthesisControls {
  speak: (text: string, options?: SpeakOptions) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

export interface SpeakOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function useSpeechSynthesis(): SpeechSynthesisState & SpeechSynthesisControls {
  const [state, setState] = useState<SpeechSynthesisState>({
    isSpeaking: false,
    isPaused: false,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    voices: [],
    error: null,
  });

  // Load available voices
  useEffect(() => {
    if (!state.isSupported) return;

    function loadVoices() {
      const availableVoices = window.speechSynthesis.getVoices();
      setState((prev) => ({ ...prev, voices: availableVoices }));
    }

    // Load voices immediately if available
    loadVoices();

    // Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [state.isSupported]);

  // Update speaking state
  useEffect(() => {
    if (!state.isSupported) return;

    const interval = setInterval(() => {
      const synth = window.speechSynthesis;
      setState((prev) => ({
        ...prev,
        isSpeaking: synth.speaking,
        isPaused: synth.paused,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [state.isSupported]);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!state.isSupported) {
        setState((prev) => ({
          ...prev,
          error: 'Speech synthesis is not supported in this browser',
        }));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (options.voice !== undefined) {
        utterance.voice = options.voice;
      }

      if (options.rate !== undefined) {
        utterance.rate = Math.max(0.1, Math.min(10, options.rate));
      }

      if (options.pitch !== undefined) {
        utterance.pitch = Math.max(0, Math.min(2, options.pitch));
      }

      if (options.volume !== undefined) {
        utterance.volume = Math.max(0, Math.min(1, options.volume));
      }

      if (options.lang !== undefined) {
        utterance.lang = options.lang;
      }

      utterance.onstart = () => {
        setState((prev) => ({ ...prev, isSpeaking: true, error: null }));
      };

      utterance.onend = () => {
        setState((prev) => ({ ...prev, isSpeaking: false }));
        options.onEnd?.();
      };

      utterance.onerror = (event) => {
        const errorMessage = `Speech synthesis error: ${event.error}`;
        setState((prev) => ({ ...prev, isSpeaking: false, error: errorMessage }));
        options.onError?.(errorMessage);
      };

      window.speechSynthesis.speak(utterance);
    },
    [state.isSupported],
  );

  const cancel = useCallback(() => {
    if (!state.isSupported) return;
    window.speechSynthesis.cancel();
    setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
  }, [state.isSupported]);

  const pause = useCallback(() => {
    if (!state.isSupported) return;
    window.speechSynthesis.pause();
    setState((prev) => ({ ...prev, isPaused: true }));
  }, [state.isSupported]);

  const resume = useCallback(() => {
    if (!state.isSupported) return;
    window.speechSynthesis.resume();
    setState((prev) => ({ ...prev, isPaused: false }));
  }, [state.isSupported]);

  return {
    ...state,
    speak,
    cancel,
    pause,
    resume,
  };
}

/**
 * Find a voice by language code or name
 */
export function findVoice(
  voices: SpeechSynthesisVoice[],
  langOrName: string,
): SpeechSynthesisVoice | undefined {
  // First try exact language match
  const exactMatch = voices.find((v) => v.lang === langOrName);
  if (exactMatch !== undefined) return exactMatch;

  // Try partial language match (e.g., "en" matches "en-US")
  const partialMatch = voices.find((v) => v.lang.startsWith(langOrName));
  if (partialMatch !== undefined) return partialMatch;

  // Try name match
  const nameMatch = voices.find((v) => v.name.toLowerCase().includes(langOrName.toLowerCase()));
  if (nameMatch !== undefined) return nameMatch;

  return undefined;
}

/**
 * Get the default voice for a language
 */
export function getDefaultVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | undefined {
  // Prefer default voices
  const defaultVoice = voices.find((v) => v.default && v.lang.startsWith(lang.split('-')[0]));
  if (defaultVoice !== undefined) return defaultVoice;

  // Fall back to any matching voice
  return findVoice(voices, lang);
}
