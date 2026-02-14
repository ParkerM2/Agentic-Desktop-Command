/**
 * VoiceButton — Push-to-talk button with visual recording indicator
 *
 * Uses Web Speech API for voice recognition.
 * Supports push-to-talk (hold) and toggle modes.
 */

import { useCallback, useEffect, useRef } from 'react';

import { AlertCircle, Mic, MicOff } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useVoiceConfig } from '../api/useVoice';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export interface VoiceButtonProps {
  /** Called when speech is transcribed */
  onTranscript: (text: string) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disable the button */
  disabled?: boolean;
}

function getAriaLabel(isListening: boolean, isPushToTalk: boolean): string {
  if (isListening) {
    return 'Stop recording';
  }
  if (isPushToTalk) {
    return 'Hold to record';
  }
  return 'Start recording';
}

function renderIcon(
  hasError: boolean,
  isSupported: boolean,
  iconSizeClass: string,
  isListening: boolean,
): React.ReactNode {
  if (hasError) {
    return <AlertCircle className={iconSizeClass} />;
  }
  if (!isSupported) {
    return <MicOff className={iconSizeClass} />;
  }
  return <Mic className={cn(iconSizeClass, isListening && 'animate-pulse')} />;
}

export function VoiceButton({
  onTranscript,
  className,
  disabled = false,
  onError,
  size = 'md',
}: VoiceButtonProps) {
  const { data: config } = useVoiceConfig();
  const isHoldingRef = useRef(false);
  const finalTranscriptRef = useRef('');

  const isPushToTalk = config?.inputMode === 'push_to_talk';
  const language = config?.language ?? 'en-US';

  const handleResult = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      finalTranscriptRef.current += transcript;
    }
  }, []);

  const handleEnd = useCallback(() => {
    if (finalTranscriptRef.current.trim().length > 0) {
      onTranscript(finalTranscriptRef.current.trim());
      finalTranscriptRef.current = '';
    }
  }, [onTranscript]);

  const handleError = useCallback(
    (error: string) => {
      onError?.(error);
    },
    [onError],
  );

  const { isListening, isSupported, error, interimTranscript, start, stop, resetTranscript } =
    useSpeechRecognition({
      language,
      continuous: !isPushToTalk,
      interimResults: true,
      onResult: handleResult,
      onError: handleError,
      onEnd: handleEnd,
    });

  // Handle push-to-talk mouse events
  const handleMouseDown = useCallback(() => {
    if (!isPushToTalk || disabled || !isSupported) return;
    isHoldingRef.current = true;
    finalTranscriptRef.current = '';
    resetTranscript();
    start();
  }, [isPushToTalk, disabled, isSupported, start, resetTranscript]);

  const handleMouseUp = useCallback(() => {
    if (!isPushToTalk || !isHoldingRef.current) return;
    isHoldingRef.current = false;
    stop();
  }, [isPushToTalk, stop]);

  // Handle toggle mode click
  const handleClick = useCallback(() => {
    if (isPushToTalk || disabled || !isSupported) return;

    if (isListening) {
      stop();
    } else {
      finalTranscriptRef.current = '';
      resetTranscript();
      start();
    }
  }, [isPushToTalk, disabled, isSupported, isListening, start, stop, resetTranscript]);

  // Cleanup on unmount or when mouse leaves while holding
  useEffect(() => {
    function handleGlobalMouseUp() {
      if (isHoldingRef.current) {
        isHoldingRef.current = false;
        stop();
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [stop]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (isPushToTalk) {
          handleMouseDown();
        } else {
          handleClick();
        }
      }
    },
    [isPushToTalk, handleMouseDown, handleClick],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && isPushToTalk) {
        e.preventDefault();
        handleMouseUp();
      }
    },
    [isPushToTalk, handleMouseUp],
  );

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const isDisabled = disabled || !isSupported;
  const hasError = error !== null;
  const showInterimTranscript = isListening && interimTranscript.length > 0;

  return (
    <div className="relative inline-flex flex-col items-center gap-1">
      <button
        aria-label={getAriaLabel(isListening, isPushToTalk)}
        aria-pressed={isListening}
        disabled={isDisabled}
        type="button"
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          sizeClasses[size],
          isListening
            ? 'bg-destructive text-destructive-foreground focus-visible:ring-destructive'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary',
          isDisabled && 'cursor-not-allowed opacity-50',
          hasError && 'bg-destructive/20 text-destructive',
          className,
        )}
        onClick={isPushToTalk ? undefined : handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseUp}
        onMouseUp={handleMouseUp}
      >
        {renderIcon(hasError, isSupported, iconSizes[size], isListening)}

        {/* Recording indicator ring */}
        {isListening ? (
          <span
            aria-hidden="true"
            className={cn('absolute inset-0 rounded-full', 'bg-destructive/30 animate-ping')}
          />
        ) : null}
      </button>

      {/* Interim transcript preview */}
      {showInterimTranscript ? (
        <div
          className={cn(
            'absolute top-full mt-2 max-w-xs rounded-md px-2 py-1',
            'bg-popover text-popover-foreground border-border border text-sm',
            'animate-in fade-in slide-in-from-top-1',
          )}
        >
          <span className="text-muted-foreground italic">{interimTranscript}</span>
        </div>
      ) : null}

      {/* Error message */}
      {hasError ? (
        <div className="text-destructive absolute top-full mt-2 max-w-xs text-xs" role="alert">
          {error}
        </div>
      ) : null}

      {/* Not supported message */}
      {isSupported ? null : (
        <div className="text-muted-foreground absolute top-full mt-2 text-xs">
          Voice not supported
        </div>
      )}
    </div>
  );
}
