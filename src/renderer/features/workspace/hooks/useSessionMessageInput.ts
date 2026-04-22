/**
 * useSessionMessageInput — Shared send + keyboard handling for session panels.
 *
 * Extracts the identical handleSend / handleKeyDown logic found in both
 * PrimarySessionPanel and TeamLeadPanel into a single reusable hook.
 */

import { useCallback } from 'react';

interface UseSessionMessageInputOpts {
  sessionId: string;
  draft: string;
  status: string;
  send: { mutate: (payload: { sessionId: string; message: string }) => void };
  clearDraft: (sessionId: string) => void;
}

export function useSessionMessageInput(opts: UseSessionMessageInputOpts) {
  const { sessionId, draft, status, send, clearDraft } = opts;

  const handleSend = useCallback(() => {
    const message = draft.trim();
    if (message.length === 0 || status !== 'live') return;
    send.mutate({ sessionId, message });
    clearDraft(sessionId);
  }, [sessionId, draft, status, send, clearDraft]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return { handleSend, handleKeyDown };
}
