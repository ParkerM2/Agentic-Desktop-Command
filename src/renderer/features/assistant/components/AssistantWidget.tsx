/**
 * AssistantWidget — Keyboard shortcuts + popup panel overlay
 *
 * Mounted in RootLayout. Handles Cmd/Ctrl+J toggle and Escape close.
 * Only renders the floating WidgetPanel when mode is 'popup'.
 * Inline mode is handled by SidebarAssistantButton.
 */

import { useCallback, useEffect, useRef } from 'react';

import { useAssistantWidgetStore } from '@renderer/shared/stores';

import { useAssistantEvents } from '../hooks/useAssistantEvents';
import { useAssistantStore } from '../store';

import { WidgetPanel } from './WidgetPanel';

export function AssistantWidget() {
  useAssistantEvents();

  const { mode, close, toggle } = useAssistantWidgetStore();
  const { resetUnread } = useAssistantStore();
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleToggle = useCallback(() => {
    if (mode === 'closed') {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      resetUnread();
    }
    toggle();
  }, [mode, toggle, resetUnread]);

  const handleClose = useCallback(() => {
    close();
    previousFocusRef.current?.focus();
  }, [close]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        handleToggle();
        return;
      }

      if (e.key === 'Escape' && mode !== 'closed') {
        e.preventDefault();
        handleClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleToggle, handleClose]);

  useEffect(() => {
    if (mode !== 'closed') {
      resetUnread();
    }
  }, [mode, resetUnread]);

  // Only render the floating panel in popup mode
  return mode === 'popup' ? <WidgetPanel onClose={handleClose} /> : null;
}
