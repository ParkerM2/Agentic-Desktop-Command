/**
 * IntegrationRequired — Setup prompt card for OAuth-dependent features
 *
 * Shows a card when an OAuth provider is not configured or not authenticated.
 * Hides itself when the provider is properly set up.
 */

import type React from 'react';

import { useNavigate } from '@tanstack/react-router';
import { Settings } from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { useOAuthStatus } from '@renderer/shared/hooks';

import { Button, Heading } from '@ui';

// ── Types ─────────────────────────────────────────────────────

interface IntegrationRequiredProps {
  provider: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// ── Component ────────────────────────────────────────────────

export function IntegrationRequired({
  provider,
  title,
  description,
  icon,
}: IntegrationRequiredProps) {
  const { data: status, isLoading } = useOAuthStatus(provider);
  const navigate = useNavigate();

  if (isLoading) {
    return null;
  }

  if (status?.authenticated) {
    return null;
  }

  const isConfigured = status?.configured ?? false;
  const IconComponent = icon;

  return (
    <div className="bg-card/50 border-border mb-4 rounded-lg border p-6 text-center">
      {IconComponent ? (
        <IconComponent className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
      ) : null}
      <Heading as="h3" className="text-sm">{title}</Heading>
      <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs">{description}</p>
      <p className="text-muted-foreground mt-2 text-xs">
        {isConfigured ? 'Authentication required' : 'Not configured'}
      </p>
      <Button
        className="mt-3"
        variant="primary"
        onClick={() => {
          void navigate({ to: ROUTES.SETTINGS });
        }}
      >
        <Settings className="h-4 w-4 shrink-0" />
        {isConfigured ? 'Connect' : 'Set Up in Settings'}
      </Button>
    </div>
  );
}
