/**
 * ProviderConsoleInfo — Developer console link and required scopes for an OAuth provider.
 */

import { ExternalLink } from 'lucide-react';

import type { ProviderConfig } from './oauth-provider-constants';

interface ProviderConsoleInfoProps {
  config: ProviderConfig;
}

export function ProviderConsoleInfo({ config }: ProviderConsoleInfoProps) {
  return (
    <>
      <div className="bg-muted/50 rounded-md p-3">
        <a
          className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          href={config.consoleUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open {config.consoleName}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <p className="text-muted-foreground mt-1 text-xs">
          Create an OAuth app and copy the credentials below.
        </p>
      </div>

      <div className="bg-info/5 border-info/20 rounded-md border p-3">
        <p className="text-info text-xs font-medium">Required Scopes:</p>
        <p className="text-muted-foreground mt-1 text-xs">{config.scopeDescription}</p>
        <code className="text-foreground mt-1.5 block text-xs">
          {config.requiredScopes.join(', ')}
        </code>
      </div>
    </>
  );
}
