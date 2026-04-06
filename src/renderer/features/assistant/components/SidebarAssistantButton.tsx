/**
 * SidebarAssistant — Assistant in the sidebar footer
 *
 * Three states:
 * 1. Collapsed sidebar or chat closed → icon button with tooltip + unread badge
 * 2. Expanded sidebar + inline mode → compact chat panel embedded in footer
 * 3. Popup mode → just the active button (panel renders via AssistantWidget)
 *
 * The inline chat panel includes a pop-out button to switch to the floating popup.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ArrowUp, Maximize2, MessageSquare, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useAssistantWidgetStore, useLayoutStore } from '@renderer/shared/stores';

import { useProjects } from '@features/projects';

import { Button } from '@ui/button';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@ui/sidebar';
import { Textarea } from '@ui/textarea';

import { useSendCommand } from '../api/useAssistant';
import { useAssistantStore } from '../store';

import { WidgetMessageArea } from './WidgetMessageArea';

// ─── Inline Input ─────────────────────────────────────────

function InlineInput({ onSubmit, disabled }: { onSubmit: (v: string) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${String(Math.min(el.scrollHeight, 64))}px`;
    }
  }, []);

  useEffect(() => { adjustHeight(); }, [draft, adjustHeight]);

  function handleSubmit() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setDraft('');
  }

  return (
    <div className="flex items-end gap-1.5 p-2">
      <Textarea
        ref={ref}
        aria-label="Message assistant"
        className="max-h-16 min-h-0 flex-1 px-2 py-1.5 text-xs"
        disabled={disabled}
        placeholder="Ask anything..."
        resize="none"
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button
        aria-label="Send"
        className="h-7 w-7 shrink-0 p-1"
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

// ─── Main Component ───────────────────────────────────────

export function SidebarAssistantButton() {
  const { mode, setMode, close } = useAssistantWidgetStore();
  const unreadCount = useAssistantStore((s) => s.unreadCount);
  const resetUnread = useAssistantStore((s) => s.resetUnread);
  const { open: sidebarExpanded } = useSidebar();
  const sendCommand = useSendCommand();
  const isThinking = useAssistantStore((s) => s.isThinking);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();

  const isActive = mode !== 'closed';
  const showInline = mode === 'inline' && sidebarExpanded;

  function handleToggle() {
    if (isActive) {
      close();
    } else {
      resetUnread();
      setMode(sidebarExpanded ? 'inline' : 'popup');
    }
  }

  function handlePopOut() {
    setMode('popup');
  }

  function handleSend(input: string) {
    const activeProject = projects?.find((p) => p.id === activeProjectId);
    sendCommand.mutate({
      input,
      projectPath: activeProject?.path ?? '',
      context: { activeProjectId: activeProjectId ?? undefined },
    });
  }

  // ── Collapsed sidebar or chat not active → button only ──
  if (!showInline) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={isActive}
            tooltip="Assistant (Ctrl+J)"
            onClick={handleToggle}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Assistant</span>
            {unreadCount > 0 && !isActive ? (
              <span
                className={cn(
                  'ml-auto flex h-4 w-4 items-center justify-center',
                  'rounded-full text-[9px] font-bold',
                  'bg-destructive text-destructive-foreground',
                )}
              >
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </span>
            ) : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // ── Expanded sidebar + inline mode → embedded chat ──────
  return (
    <div className="flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <button
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium"
          onClick={handleToggle}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Assistant
        </button>
        <div className="flex items-center gap-0.5">
          <Button
            aria-label="Pop out to window"
            className="text-muted-foreground h-5 w-5 p-0.5"
            size="icon"
            variant="ghost"
            onClick={handlePopOut}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button
            aria-label="Close assistant"
            className="text-muted-foreground h-5 w-5 p-0.5"
            size="icon"
            variant="ghost"
            onClick={close}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Message area — constrained height */}
      <div className="border-border max-h-48 min-h-24 overflow-hidden border-t">
        <WidgetMessageArea />
      </div>

      {/* Input */}
      <div className="border-border border-t">
        <InlineInput disabled={isThinking} onSubmit={handleSend} />
      </div>
    </div>
  );
}
