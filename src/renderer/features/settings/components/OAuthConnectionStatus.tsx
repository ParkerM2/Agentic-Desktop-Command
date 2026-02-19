/**
 * OAuthConnectionStatus — Shows connection state and connect/disconnect buttons
 * for a single OAuth provider. Appears inside the expanded provider card.
 */

import { LogIn, LogOut } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Spinner } from '@ui';


import { useOAuthAuthorize, useOAuthRevoke, useOAuthStatus } from '../api/useOAuth';

import { ICON_SIZE } from './oauth-provider-constants';

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
    return <Spinner className="text-muted-foreground" size="sm" />;
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
        <Button
          disabled={isMutating}
          variant="outline"
          className={cn(
            'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30',
          )}
          onClick={() => {
            revokeMutation.mutate(provider);
          }}
        >
          {revokeMutation.isPending ? (
            <Spinner size="sm" />
          ) : (
            <LogOut className={ICON_SIZE} />
          )}
          Disconnect
        </Button>
      ) : (
        <Button
          disabled={isMutating}
          variant="primary"
          onClick={() => {
            authorizeMutation.mutate(provider);
          }}
        >
          {authorizeMutation.isPending ? (
            <Spinner size="sm" />
          ) : (
            <LogIn className={ICON_SIZE} />
          )}
          Connect
        </Button>
      )}
    </div>
  );
}
