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

import { Maximize2, MessageSquare, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useAssistantWidgetStore, useLayoutStore } from '@renderer/shared/stores';

import { Button } from '@ui/button';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@ui/sidebar';

import { useSendCommand } from '../api/useAssistant';
import { useAssistantStore } from '../store';

import { AssistantInputBar } from './AssistantInputBar';
import { ProjectSelector } from './ProjectSelector';
import { WidgetMessageArea } from './WidgetMessageArea';

// ─── Main Component ───────────────────────────────────────

export function SidebarAssistantButton() {
  const { mode, setMode, close } = useAssistantWidgetStore();
  const unreadCount = useAssistantStore((s) => s.unreadCount);
  const resetUnread = useAssistantStore((s) => s.resetUnread);
  const { open: sidebarExpanded } = useSidebar();
  const sendCommand = useSendCommand();
  const isThinking = useAssistantStore((s) => s.isThinking);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const setActiveProject = useLayoutStore((s) => s.setActiveProject);

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
    sendCommand.mutate({
      input,
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
    <div className="assistant-inline border-border flex flex-1 flex-col border-t">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <ProjectSelector
          selectedProjectId={activeProjectId}
          onSelect={(id) => setActiveProject(id)}
        />
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

      {/* Message area — scrolls, input stays pinned */}
      <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden border-t">
        <WidgetMessageArea />
      </div>

      {/* Input — sticky bottom */}
      <div className="shrink-0">
        <AssistantInputBar compact disabled={isThinking} onSubmit={handleSend} />
      </div>
    </div>
  );
}
