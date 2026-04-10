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

import { VoiceButton } from '@features/settings';

import { Button } from '@ui/button';
import { Textarea } from '@ui/textarea';

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
      <Textarea
        ref={textareaRef}
        aria-label="Message assistant"
        disabled={disabled}
        placeholder="Ask anything..."
        resize="none"
        rows={1}
        value={draft}
        className={cn(
          'max-h-20 min-h-0 flex-1 px-2.5 py-1.5 text-xs',
        )}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <VoiceButton
        disabled={disabled}
        size="sm"
        onTranscript={handleVoiceTranscript}
      />
      <Button
        aria-label="Send message"
        className="h-7 w-7 shrink-0 p-1.5"
        disabled={disabled === true || draft.trim().length === 0}
        size="icon"
        variant="primary"
        onClick={handleSubmit}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
