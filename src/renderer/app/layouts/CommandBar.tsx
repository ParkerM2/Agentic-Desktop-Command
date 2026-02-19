/**
 * CommandBar — Global assistant input always visible in the top bar
 *
 * Single-line input for sending commands to the assistant.
 * Supports history cycling, keyboard shortcuts, and toast notifications.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { CheckCircle, Command, Loader2, XCircle } from 'lucide-react';

import type { AssistantResponse } from '@shared/types/assistant';

import { cn } from '@renderer/shared/lib/utils';
import { useCommandBarStore } from '@renderer/shared/stores';

import { useAssistantEvents, useSendCommand } from '@features/assistant';
import { VoiceButton } from '@features/voice';

export function CommandBar() {
  // 1. Hooks
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputValue, setInputValue] = useState('');

  const {
    isProcessing,
    lastResponse,
    inputHistory,
    historyIndex,
    isToastVisible,
    setProcessing,
    setLastResponse,
    addToHistory,
    setHistoryIndex,
    showToast,
    hideToast,
  } = useCommandBarStore();

  const sendCommand = useSendCommand();
  useAssistantEvents();

  // 2. Derived state
  const hasInput = inputValue.trim().length > 0;
  const isError = lastResponse?.type === 'error';

  // 3. Handlers
  const dismissToast = useCallback(() => {
    hideToast();
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, [hideToast]);

  const showResult = useCallback(
    (response: AssistantResponse) => {
      setLastResponse(response);
      setProcessing(false);
      showToast();
      toastTimerRef.current = setTimeout(() => {
        dismissToast();
      }, 4000);
    },
    [setLastResponse, setProcessing, showToast, dismissToast],
  );

  // Voice transcript handler — auto-submit transcribed text as a command
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || isProcessing) return;
      setProcessing(true);
      addToHistory(trimmed);
      sendCommand.mutate(
        { input: trimmed },
        {
          onSuccess: (data) => {
            showResult(data);
          },
          onError: () => {
            showResult({ type: 'error', content: 'Command failed' });
          },
        },
      );
    },
    [isProcessing, setProcessing, addToHistory, sendCommand, showResult],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0 || isProcessing) return;
    setProcessing(true);
    addToHistory(trimmed);
    setInputValue('');
    sendCommand.mutate(
      { input: trimmed },
      {
        onSuccess: (data) => {
          showResult(data);
        },
        onError: () => {
          showResult({ type: 'error', content: 'Command failed' });
        },
      },
    );
  }, [inputValue, isProcessing, setProcessing, addToHistory, sendCommand, showResult]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
      return;
    }

    if (event.key === 'Escape') {
      setInputValue('');
      inputRef.current?.blur();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const maxIndex = inputHistory.length - 1;
      if (maxIndex < 0) return;
      const nextIndex = Math.min(historyIndex + 1, maxIndex);
      setHistoryIndex(nextIndex);
      setInputValue(inputHistory[nextIndex] ?? '');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInputValue('');
        return;
      }
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setInputValue(inputHistory[nextIndex] ?? '');
    }
  }

  // Ctrl+K / Cmd+K global shortcut to focus
  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // 4. Render
  return (
    <div className="relative flex items-center gap-2">
      <div className="border-border bg-background flex min-w-48 flex-1 items-center gap-2 rounded-md border px-2 py-1">
        {isProcessing ? (
          <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : (
          <Command className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        )}
        <input
          ref={inputRef}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isProcessing}
          placeholder="Ask Claude... (notes, tasks, reminders)"
          type="text"
          value={inputValue}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
        />
        <VoiceButton
          className="h-6 w-6"
          disabled={isProcessing}
          size="sm"
          onTranscript={handleVoiceTranscript}
        />
        <button
          aria-label="Send command"
          disabled={!hasInput || isProcessing}
          type="button"
          className={cn(
            'text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 text-xs transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-30',
          )}
          onClick={handleSubmit}
        >
          <span className="text-[10px] font-medium">&#x23CE;</span>
        </button>
      </div>

      {/* Toast notification */}
      {isToastVisible && lastResponse !== null ? (
        <div
          className="border-border bg-card text-foreground absolute top-full right-0 z-50 mt-2 max-w-sm rounded-lg border p-3 shadow-lg"
          role="status"
        >
          <div className="flex items-start gap-2">
            {isError ? (
              <XCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle className="text-success mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="text-sm">{lastResponse.content}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
