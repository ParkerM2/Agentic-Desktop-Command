/**
 * useSpeechRecognition — React hook wrapping Web Speech API
 *
 * Uses browser-native SpeechRecognition (or webkitSpeechRecognition).
 * Returns transcript, listening state, and control functions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechRecognitionState {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
}

export interface SpeechRecognitionControls {
  start: () => void;
  stop: () => void;
  resetTranscript: () => void;
}

export interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

// Web Speech API types (not included in lib.dom.d.ts)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): SpeechRecognitionState & SpeechRecognitionControls {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options;

  const [state, setState] = useState<SpeechRecognitionState>({
    transcript: '',
    interimTranscript: '',
    isListening: false,
    isSupported: getSpeechRecognition() !== null,
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isStartingRef = useRef(false);

  // Initialize recognition instance
  useEffect(() => {
    const SpeechRecognitionAPI = getSpeechRecognition();
    if (SpeechRecognitionAPI === null) {
      setState((prev) => ({
        ...prev,
        isSupported: false,
        error: 'Speech recognition is not supported in this browser',
      }));
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      isStartingRef.current = false;
      setState((prev) => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onend = () => {
      isStartingRef.current = false;
      setState((prev) => ({ ...prev, isListening: false }));
      onEnd?.();
    };

    recognition.onerror = (event) => {
      isStartingRef.current = false;
      const errorMessage = getErrorMessage(event.error);
      setState((prev) => ({ ...prev, error: errorMessage, isListening: false }));
      onError?.(errorMessage);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      setState((prev) => ({
        ...prev,
        transcript: prev.transcript + finalTranscript,
        interimTranscript,
      }));

      if (finalTranscript.length > 0) {
        onResult?.(finalTranscript, true);
      } else if (interimTranscript.length > 0) {
        onResult?.(interimTranscript, false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [language, continuous, interimResults, onResult, onError, onEnd]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition === null || isStartingRef.current) return;

    try {
      isStartingRef.current = true;
      recognition.start();
    } catch (err) {
      isStartingRef.current = false;
      // Ignore "already started" errors
      if (err instanceof Error && !err.message.includes('already started')) {
        setState((prev) => ({ ...prev, error: err.message }));
      }
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition === null) return;

    try {
      recognition.stop();
    } catch {
      // Ignore errors when stopping
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '', interimTranscript: '' }));
  }, []);

  return {
    ...state,
    start,
    stop,
    resetTranscript,
  };
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'audio-capture':
      return 'No microphone was found. Please ensure a microphone is connected.';
    case 'not-allowed':
      return 'Microphone access was denied. Please allow microphone access.';
    case 'network':
      return 'Network error occurred. Please check your connection.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'language-not-supported':
      return 'The specified language is not supported.';
    case 'service-not-allowed':
      return 'Speech recognition service is not allowed.';
    default:
      return `Speech recognition error: ${error}`;
  }
}
