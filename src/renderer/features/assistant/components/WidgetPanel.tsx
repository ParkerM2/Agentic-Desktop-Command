/**
 * WidgetPanel — Assembled floating chat panel for the assistant widget
 *
 * Contains header (title + voice toggle + clear + close), message area,
 * and input with send button.
 * Focuses input on mount and restores focus on close.
 */

import { useEffect, useRef } from 'react';

import { useRouterState } from '@tanstack/react-router';
import { Trash2, Volume2, VolumeX, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useAssistantWidgetStore, useLayoutStore } from '@renderer/shared/stores';

import { Button, Heading } from '@ui';


import { useClearHistory, useSendCommand } from '../api/useAssistant';
import { useAssistantStore } from '../store';

import { AssistantInputBar } from './AssistantInputBar';
import { WidgetMessageArea } from './WidgetMessageArea';

interface WidgetPanelProps {
  onClose: () => void;
}

export function WidgetPanel({ onClose }: WidgetPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const sendCommand = useSendCommand();
  const clearHistory = useClearHistory();
  const responseHistory = useAssistantStore((s) => s.responseHistory);
  const voiceOutputEnabled = useAssistantWidgetStore((s) => s.voiceOutputEnabled);
  const toggleVoiceOutput = useAssistantWidgetStore((s) => s.toggleVoiceOutput);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Focus the first focusable element (input) on mount
    const input = panel.querySelector('textarea');
    input?.focus();
  }, []);

  function getActiveView(path: string): string {
    if (path.includes('/planner')) return 'planner';
    if (path.includes('/ideation')) return 'ideation';
    if (path.includes('/notes')) return 'notes';
    if (path.includes('/fitness')) return 'fitness';
    if (path.includes('/dashboard') || path === '/') return 'dashboard';
    return 'default';
  }

  function handleSendCommand(input: string) {
    sendCommand.mutate({
      input,
      context: {
        activeView: getActiveView(pathname),
        activeProjectId: activeProjectId ?? undefined,
      },
    });
  }

  function handleClearHistory() {
    clearHistory.mutate();
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed bottom-4 left-4 z-50',
        'bg-card border-border flex w-[380px] flex-col rounded-lg border',
        'shadow-xl',
        'animate-slide-up-panel',
        'min-h-[40vh] max-h-[70vh]',
      )}
    >
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <Heading as="h2" className="text-sm">Assistant</Heading>
        <div className="flex items-center gap-1">
          <Button
            aria-label={voiceOutputEnabled ? 'Disable voice output' : 'Enable voice output'}
            size="icon"
            variant="ghost"
            className={cn(
              'h-6 w-6 p-1',
              voiceOutputEnabled ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground',
            )}
            onClick={toggleVoiceOutput}
          >
            {voiceOutputEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </Button>
          {responseHistory.length > 0 ? (
            <Button
              aria-label="Clear history"
              className="text-muted-foreground h-6 w-6 p-1"
              size="icon"
              variant="ghost"
              onClick={handleClearHistory}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            aria-label="Close assistant"
            className="text-muted-foreground h-6 w-6 p-1"
            size="icon"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Message area */}
      <WidgetMessageArea />

      {/* Input */}
      <AssistantInputBar disabled={sendCommand.isPending} onSubmit={handleSendCommand} />
    </div>
  );
}
