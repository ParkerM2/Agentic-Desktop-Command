/**
 * WidgetInput — Compact input for the floating assistant widget
 *
 * Single-line textarea that auto-grows to max-h-20.
 * Enter sends, Shift+Enter adds a newline.
 * Includes a mic button for voice input via VoiceButton.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ArrowUp } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { VoiceButton } from '@features/voice';

interface WidgetInputProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
}

export function WidgetInput({ disabled, onSubmit }: WidgetInputProps) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${String(Math.min(textarea.scrollHeight, 80))}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [draft, adjustHeight]);

  function handleSubmit() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setDraft('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleVoiceTranscript(text: string) {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
    }
  }

  return (
    <div className="border-border flex items-end gap-2 border-t p-2.5">
      <textarea
        ref={textareaRef}
        aria-label="Message assistant"
        disabled={disabled}
        placeholder="Ask anything..."
        rows={1}
        value={draft}
        className={cn(
          'border-border bg-background text-foreground max-h-20 flex-1 resize-none rounded-md border px-2.5 py-1.5 text-xs',
          'placeholder:text-muted-foreground',
          'focus:ring-ring focus:ring-1 focus:outline-none',
          'disabled:opacity-50',
        )}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <VoiceButton
        disabled={disabled}
        size="sm"
        onTranscript={handleVoiceTranscript}
      />
      <button
        aria-label="Send message"
        disabled={disabled === true || draft.trim().length === 0}
        className={cn(
          'bg-primary text-primary-foreground shrink-0 rounded-md p-1.5',
          'hover:bg-primary/90 transition-colors',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
        onClick={handleSubmit}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
