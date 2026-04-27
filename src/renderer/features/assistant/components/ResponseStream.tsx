/**
 * ResponseStream — Renders command/response pairs with auto-scroll
 */

import { useEffect, useRef } from 'react';

import { AlertCircle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { MarkdownMessage, ThinkingIndicator } from '@ui';

import { useAssistantStore } from '../store';

import type { ChatEntry, ResponseEntry } from '../store';

const RESPONSE_STYLES: Record<ResponseEntry['type'], string> = {
  text: 'bg-muted/50',
  error: 'bg-destructive/10 border border-destructive/20',
};

function ResponseIcon({ type }: { type: ResponseEntry['type'] }) {
  if (type === 'error') {
    return <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />;
  }
  return null;
}

export function ResponseStream() {
  const { isThinking, responseHistory } = useAssistantStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [responseHistory.length, isThinking]);

  if (!isThinking && responseHistory.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Send a command to get started
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {responseHistory.map((entry: ChatEntry) => (
          entry.kind === 'user' ? (
            <div key={entry.id} className="flex justify-end">
              <div className="bg-primary text-primary-foreground max-w-[80%] rounded-lg px-3 py-2 text-sm">
                {entry.input}
              </div>
            </div>
          ) : (
            <div key={entry.id} className="space-y-2">
              {/* Assistant response */}
              <div className="flex gap-2">
                <ResponseIcon type={entry.type} />
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2',
                    'text-foreground',
                    RESPONSE_STYLES[entry.type],
                  )}
                >
                  <MarkdownMessage>{entry.response}</MarkdownMessage>
                </div>
              </div>
            </div>
          )
        ))}

        {isThinking ? (
          <ThinkingIndicator label="Assistant" size="md" />
        ) : null}
      </div>
    </div>
  );
}
