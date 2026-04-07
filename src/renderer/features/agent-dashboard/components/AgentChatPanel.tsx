/**
 * AgentChatPanel — Core chat renderer
 *
 * Renders a scrollable list of AgentChatMessage items.
 * Auto-scrolls to the latest message.
 * Handles streaming messages (partial text updates).
 */

import { useRef, useEffect } from 'react';

import type { AgentChatItem } from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { ScrollArea } from '@ui';

import { ActivityLine } from './ActivityLine';
import { TextMessage } from './TextMessage';
import { ToolCallCard } from './ToolCallCard';
import { UserMessage } from './UserMessage';

// ─── Props ─────────────────────────────────────────────────

interface AgentChatPanelProps {
  messages: AgentChatItem[];
  className?: string;
  onViewAgent?: (agentId: string) => void;
}

// ─── Component ─────────────────────────────────────────────

export function AgentChatPanel({ messages, className, onViewAgent }: AgentChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <p className="text-sm text-muted-foreground">No messages yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-5 px-4 pt-4 pb-8">
        {messages.map((msg) => {
          if (msg.kind === 'text') {
            if (msg.message.role === 'user') {
              return (
                <UserMessage
                  key={msg.message.id}
                  message={msg.message}
                />
              );
            }
            return (
              <TextMessage
                key={msg.message.id}
                message={msg.message}
              />
            );
          }
          if (msg.kind === 'activity') {
            return (
              <ActivityLine
                key={msg.activity.id}
                summary={msg.activity.summary}
                toolName={msg.activity.toolName}
              />
            );
          }
          return (
            <ToolCallCard
              key={msg.toolCall.id}
              toolCall={msg.toolCall}
              onViewAgent={onViewAgent}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
