/**
 * GitHubSetupInstructions — Step-by-step guide for configuring a GitHub webhook integration.
 */

import { ExternalLink } from 'lucide-react';

export function GitHubSetupInstructions() {
  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="text-foreground mb-1 font-medium">1. Navigate to Repository Settings</p>
        <p className="text-muted-foreground">
          Go to your GitHub repository, then Settings &rarr; Webhooks &rarr; Add webhook.
        </p>
        <a
          className="text-primary mt-1 inline-flex items-center gap-1 hover:underline"
          href="https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub Webhooks Documentation
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div>
        <p className="text-foreground mb-1 font-medium">2. Configure the Webhook</p>
        <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-1">
          <li>Payload URL: Use the webhook URL shown below</li>
          <li>Content type: application/json</li>
          <li>Secret: Generate a strong secret and enter it below</li>
        </ul>
      </div>
      <div>
        <p className="text-foreground mb-1 font-medium">3. Select Events</p>
        <p className="text-muted-foreground">
          Choose which events trigger the webhook. For task creation, select &quot;Issues&quot; and
          &quot;Issue comments&quot;.
        </p>
      </div>
      <div className="bg-info/10 text-info border-info/20 rounded-md border p-2">
        <p className="font-medium">Tip: Generate a Secure Secret</p>
        <p className="text-muted-foreground mt-1">
          Use a random string generator or run: openssl rand -hex 32
        </p>
      </div>
    </div>
  );
}
