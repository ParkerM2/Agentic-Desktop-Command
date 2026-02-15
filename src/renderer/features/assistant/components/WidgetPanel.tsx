/**
 * WidgetPanel — Assembled floating chat panel for the assistant widget
 *
 * Contains header (title + clear + close), message area, quick action chips, and input.
 * Focuses input on mount and restores focus on close.
 */

import { useEffect, useRef } from 'react';

import { Bell, ClipboardList, Play, StickyNote, Trash2, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useClearHistory, useSendCommand } from '../api/useAssistant';
import { useAssistantStore } from '../store';

import { WidgetInput } from './WidgetInput';
import { WidgetMessageArea } from './WidgetMessageArea';

interface WidgetPanelProps {
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { label: 'New Note', icon: StickyNote, command: 'create a new note' },
  { label: 'New Task', icon: ClipboardList, command: 'create a new task' },
  { label: 'Run Agent', icon: Play, command: 'run agent on current task' },
  { label: 'Remind Me', icon: Bell, command: 'set a reminder' },
] as const;

export function WidgetPanel({ onClose }: WidgetPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const sendCommand = useSendCommand();
  const clearHistory = useClearHistory();
  const responseHistory = useAssistantStore((s) => s.responseHistory);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Focus the first focusable element (input) on mount
    const input = panel.querySelector('textarea');
    input?.focus();
  }, []);

  function handleSendCommand(input: string) {
    sendCommand.mutate({ input });
  }

  function handleClearHistory() {
    clearHistory.mutate();
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed right-6 bottom-20 z-50',
        'bg-card border-border flex w-[380px] flex-col rounded-lg border',
        'shadow-xl',
        'animate-slide-up-panel',
        'max-h-[70vh]',
      )}
    >
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-foreground text-sm font-semibold">Assistant</h2>
        <div className="flex items-center gap-1">
          {responseHistory.length > 0 ? (
            <button
              aria-label="Clear history"
              className={cn(
                'text-muted-foreground rounded-md p-1',
                'hover:bg-muted hover:text-foreground transition-colors',
              )}
              onClick={handleClearHistory}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            aria-label="Close assistant"
            className={cn(
              'text-muted-foreground rounded-md p-1',
              'hover:bg-muted hover:text-foreground transition-colors',
            )}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Message area */}
      <WidgetMessageArea />

      {/* Quick action chips */}
      <div className="border-border flex flex-wrap gap-1.5 border-t px-2.5 py-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            disabled={sendCommand.isPending}
            className={cn(
              'border-border text-muted-foreground flex items-center gap-1 rounded-md border px-2 py-1 text-[10px]',
              'hover:bg-accent hover:text-foreground transition-colors',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
            onClick={() => handleSendCommand(action.command)}
          >
            <action.icon className="h-3 w-3" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <WidgetInput disabled={sendCommand.isPending} onSubmit={handleSendCommand} />
    </div>
  );
}
