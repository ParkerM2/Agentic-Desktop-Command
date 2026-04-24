/**
 * RevocationModal — Global modal that reacts to hub revocation events.
 *
 * Listens for `event:hub.revoked` (emitted by the main process when a hub
 * closes our WebSocket with close code 4003 — hub admin revoked access).
 * Shows an AlertDialog with the revoked hub's display name, the reason
 * string supplied by the hub admin, and three actions:
 *
 *   - Re-pair   — navigates to Settings so the user can re-pair the hub.
 *   - Switch hub — navigates to Settings so the user can pick a different
 *                 paired hub (or discover a new one).
 *   - Dismiss   — closes the modal.
 *
 * State is kept local via useState — a single in-flight revocation at a
 * time is the expected case. If another revocation event arrives while
 * the modal is open, the newest one takes over (see `stateOnRevoked`).
 *
 * Mounted at the app root via RootLayout so it's active wherever the user
 * is in the UI when the event fires.
 */

import { useEffect, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';
import { HUB_EVENTS } from '@shared/ipc/hub/channels';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui';

import { useHubDiscovery } from '../../api/useHubDiscovery';

import {
  INITIAL_REVOCATION_STATE,
  resolveDisplayName,
  stateOnDismiss,
  stateOnRevoked,
  type RevocationModalState,
} from './derive';

export function RevocationModal() {
  const [state, setState] = useState<RevocationModalState>(INITIAL_REVOCATION_STATE);
  const { data } = useHubDiscovery();
  const navigate = useNavigate();

  useEffect(() => {
    const off = window.api.on(HUB_EVENTS.REVOKED, (payload) => {
      setState((prev) => stateOnRevoked(prev, payload));
    });
    return () => {
      off();
    };
  }, []);

  function handleDismiss() {
    setState((prev) => stateOnDismiss(prev));
  }

  function handleGoToSettings() {
    handleDismiss();
    void navigate({ to: ROUTES.SETTINGS });
  }

  const displayName = resolveDisplayName(data?.paired, state.hubId);

  return (
    <AlertDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) handleDismiss();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Access revoked</AlertDialogTitle>
          <AlertDialogDescription>
            Access to &ldquo;{displayName}&rdquo; was revoked. Reason: {state.reason}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>Dismiss</AlertDialogCancel>
          <AlertDialogAction onClick={handleGoToSettings}>Switch hub</AlertDialogAction>
          <AlertDialogAction onClick={handleGoToSettings}>Re-pair</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
