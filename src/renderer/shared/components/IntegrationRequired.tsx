/**
 * IntegrationRequired — Setup prompt card for OAuth-dependent features
 *
 * Shows a card when an OAuth provider is not configured or not authenticated.
 * Hides itself when the provider is properly set up.
 */

import type React from 'react';

import { useNavigate } from '@tanstack/react-router';
import { Settings } from 'lucide-react';

import { useOAuthStatus } from '@renderer/shared/hooks';

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
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs">{description}</p>
      <p className="text-muted-foreground mt-2 text-xs">
        {isConfigured ? 'Authentication required' : 'Not configured'}
      </p>
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        type="button"
        onClick={() => {
          void navigate({ to: '/settings' });
        }}
      >
        <Settings className="h-4 w-4" />
        {isConfigured ? 'Connect' : 'Set Up in Settings'}
      </button>
    </div>
  );
}
