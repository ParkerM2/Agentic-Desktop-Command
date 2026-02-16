/**
 * WidgetMessageArea — Compact chat message area for the floating widget
 *
 * Reads responseHistory + isThinking from the assistant store.
 * Auto-scrolls on new messages. User messages right-aligned, assistant left-aligned.
 * Speaks responses aloud when voice output is enabled.
 */

import { useEffect, useRef } from 'react';

import { AlertCircle, Bell, Loader2, MessageSquare, Zap } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useAssistantWidgetStore } from '@renderer/shared/stores/assistant-widget-store';

import { useSpeechSynthesis } from '@features/voice';

import { useAssistantStore } from '../store';

import type { ResponseEntry } from '../store';

const RESPONSE_STYLES: Record<ResponseEntry['type'], string> = {
  text: 'bg-muted/50',
  action: 'bg-primary/10 border border-primary/20',
  error: 'bg-destructive/10 border border-destructive/20',
  proactive: 'bg-info/10 border border-info/20',
};

const TTS_MAX_LENGTH = 200;

function ResponseIcon({ type }: { type: ResponseEntry['type'] }) {
  if (type === 'action') {
    return <Zap className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />;
  }
  if (type === 'error') {
    return <AlertCircle className="text-destructive mt-0.5 h-3.5 w-3.5 shrink-0" />;
  }
  if (type === 'proactive') {
    return <Bell className="text-info mt-0.5 h-3.5 w-3.5 shrink-0" />;
  }
  return null;
}

export function WidgetMessageArea() {
  const { isThinking, responseHistory } = useAssistantStore();
  const voiceOutputEnabled = useAssistantWidgetStore((s) => s.voiceOutputEnabled);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const { speak, cancel } = useSpeechSynthesis();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [responseHistory.length, isThinking]);

  // Speak new responses when voice output is enabled
  useEffect(() => {
    if (!voiceOutputEnabled || responseHistory.length === 0) {
      return;
    }

    const latest = responseHistory.at(-1);
    if (!latest || latest.id === lastSpokenIdRef.current) {
      return;
    }

    // Only speak text and action responses, not errors
    if (latest.type === 'error') {
      return;
    }

    lastSpokenIdRef.current = latest.id;

    // Truncate long responses for TTS
    const content = latest.response.length > TTS_MAX_LENGTH
      ? `${latest.response.slice(0, TTS_MAX_LENGTH)}... see full response in chat`
      : latest.response;

    // Cancel any ongoing speech before speaking new response
    cancel();
    speak(content);
  }, [voiceOutputEnabled, responseHistory, speak, cancel]);

  if (!isThinking && responseHistory.length === 0) {
    return (
      <div
        aria-label="Assistant messages"
        aria-live="polite"
        className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
        role="log"
      >
        <MessageSquare className="h-8 w-8 opacity-30" />
        <p className="text-xs">Ask the assistant anything or use a quick action below.</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      aria-label="Assistant messages"
      aria-live="polite"
      className="flex-1 overflow-y-auto p-3"
      role="log"
    >
      <div className="space-y-3">
        {responseHistory.map((entry) => (
          <div key={entry.id} className="space-y-1.5">
            {/* User message — hidden for proactive notifications */}
            {entry.type === 'proactive' ? null : (
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs">
                  {entry.input}
                </div>
              </div>
            )}

            {/* Assistant response */}
            <div className="flex gap-1.5">
              <ResponseIcon type={entry.type} />
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-2.5 py-1.5',
                  'text-foreground text-xs leading-relaxed whitespace-pre-wrap',
                  RESPONSE_STYLES[entry.type],
                )}
              >
                {entry.response}
              </div>
            </div>
          </div>
        ))}

        {isThinking ? (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
