/**
 * OAuthConnectionStatus — Shows connection state and connect/disconnect buttons
 * for a single OAuth provider. Appears inside the expanded provider card.
 */

import { Loader2, LogIn, LogOut } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useOAuthAuthorize, useOAuthRevoke, useOAuthStatus } from '../api/useOAuth';

import { BUTTON_BASE, ICON_SIZE } from './oauth-provider-constants';

interface OAuthConnectionStatusProps {
  provider: string;
  hasCredentials: boolean;
}

function StatusIndicator({
  isAuthenticated,
  isLoading,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Loader2 className={cn(ICON_SIZE, 'text-muted-foreground animate-spin')} />;
  }

  if (isAuthenticated) {
    return (
      <>
        <span aria-hidden="true" className="bg-success h-2.5 w-2.5 rounded-full" />
        <span className="text-success text-sm font-medium">Connected</span>
      </>
    );
  }

  return (
    <>
      <span aria-hidden="true" className="bg-muted-foreground h-2.5 w-2.5 rounded-full" />
      <span className="text-muted-foreground text-sm">Not connected</span>
    </>
  );
}

export function OAuthConnectionStatus({ provider, hasCredentials }: OAuthConnectionStatusProps) {
  const { data: status, isLoading: isStatusLoading } = useOAuthStatus(provider);
  const authorizeMutation = useOAuthAuthorize();
  const revokeMutation = useOAuthRevoke();

  const isAuthenticated = status?.authenticated === true;
  const isMutating = authorizeMutation.isPending || revokeMutation.isPending;

  // Don't show connection controls if credentials aren't configured yet
  if (!hasCredentials) {
    return null;
  }

  return (
    <div className="border-border flex items-center justify-between border-t pt-3">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <StatusIndicator isAuthenticated={isAuthenticated} isLoading={isStatusLoading} />
      </div>

      {/* Connect / Disconnect button */}
      {isAuthenticated ? (
        <button
          disabled={isMutating}
          type="button"
          className={cn(
            BUTTON_BASE,
            'border-border text-muted-foreground border',
            'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          onClick={() => {
            revokeMutation.mutate(provider);
          }}
        >
          {revokeMutation.isPending ? (
            <Loader2 className={cn(ICON_SIZE, 'animate-spin')} />
          ) : (
            <LogOut className={ICON_SIZE} />
          )}
          Disconnect
        </button>
      ) : (
        <button
          disabled={isMutating}
          type="button"
          className={cn(
            BUTTON_BASE,
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          onClick={() => {
            authorizeMutation.mutate(provider);
          }}
        >
          {authorizeMutation.isPending ? (
            <Loader2 className={cn(ICON_SIZE, 'animate-spin')} />
          ) : (
            <LogIn className={ICON_SIZE} />
          )}
          Connect
        </button>
      )}
    </div>
  );
}
