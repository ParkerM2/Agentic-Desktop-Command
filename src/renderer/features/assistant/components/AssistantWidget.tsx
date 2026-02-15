/**
 * AssistantWidget — Top-level orchestrator for the floating assistant widget
 *
 * Mounted in RootLayout. Renders WidgetFab + conditional WidgetPanel.
 * Handles keyboard shortcuts (Cmd/Ctrl+J toggle, Escape close).
 * Subscribes to assistant IPC events and manages unread state.
 */

import { useCallback, useEffect, useRef } from 'react';

import { useAssistantWidgetStore } from '@renderer/shared/stores';

import { useAssistantEvents } from '../hooks/useAssistantEvents';
import { useAssistantStore } from '../store';

import { WidgetFab } from './WidgetFab';
import { WidgetPanel } from './WidgetPanel';

export function AssistantWidget() {
  useAssistantEvents();

  const { close, isOpen, toggle } = useAssistantWidgetStore();
  const { resetUnread, unreadCount } = useAssistantStore();
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Reset unread when opening
  const handleToggle = useCallback(() => {
    if (!isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      resetUnread();
    }
    toggle();
  }, [isOpen, toggle, resetUnread]);

  const handleClose = useCallback(() => {
    close();
    previousFocusRef.current?.focus();
  }, [close]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+J — toggle widget
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        handleToggle();
        return;
      }

      // Escape — close panel (only when open)
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleToggle, handleClose]);

  // Reset unread when widget is opened
  useEffect(() => {
    if (isOpen) {
      resetUnread();
    }
  }, [isOpen, resetUnread]);

  return (
    <>
      <WidgetFab
        hasUnread={unreadCount > 0}
        isOpen={isOpen}
        unreadCount={unreadCount}
        onClick={handleToggle}
      />
      {isOpen ? <WidgetPanel onClose={handleClose} /> : null}
    </>
  );
}
