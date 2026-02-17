/**
 * SlackSetupInstructions — Step-by-step guide for configuring a Slack webhook integration.
 */

import { ExternalLink } from 'lucide-react';

export function SlackSetupInstructions() {
  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="text-foreground mb-1 font-medium">1. Create a Slack App</p>
        <p className="text-muted-foreground">
          Go to the Slack API portal and create a new app for your workspace.
        </p>
        <a
          className="text-primary mt-1 inline-flex items-center gap-1 hover:underline"
          href="https://api.slack.com/apps"
          rel="noopener noreferrer"
          target="_blank"
        >
          Open Slack API Portal
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div>
        <p className="text-foreground mb-1 font-medium">2. Get the Bot Token</p>
        <p className="text-muted-foreground">
          Under &quot;OAuth &amp; Permissions&quot;, install the app to your workspace and copy the
          Bot User OAuth Token (starts with xoxb-).
        </p>
      </div>
      <div>
        <p className="text-foreground mb-1 font-medium">3. Get the Signing Secret</p>
        <p className="text-muted-foreground">
          Under &quot;Basic Information&quot;, scroll to &quot;App Credentials&quot; and copy the
          Signing Secret.
        </p>
      </div>
      <div>
        <p className="text-foreground mb-1 font-medium">4. Configure Slash Commands</p>
        <p className="text-muted-foreground">
          Under &quot;Slash Commands&quot;, create a command (e.g., /task) and set the Request URL
          to your webhook URL shown below.
        </p>
      </div>
      <div className="bg-info/10 text-info border-info/20 rounded-md border p-2">
        <p className="font-medium">Required Bot Token Scopes:</p>
        <p className="text-muted-foreground mt-1">
          commands, chat:write, users:read (add under OAuth &amp; Permissions)
        </p>
      </div>
    </div>
  );
}
