/**
 * WebhookSettings — Webhook configuration section for the Settings page
 *
 * Configures Slack and GitHub webhook credentials, displays computed webhook
 * URLs from the Hub URL setting, and provides copy-to-clipboard functionality.
 * Includes collapsible setup instructions for each webhook type.
 */

import { useCallback, useState } from 'react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Spinner } from '@ui';


import { useHubStatus } from '../api/useHub';
import { useUpdateWebhookConfig, useWebhookConfig } from '../api/useWebhookConfig';

import { CollapsibleInstructions } from './CollapsibleInstructions';
import { GitHubSetupInstructions } from './GitHubSetupInstructions';
import { SecretInput } from './SecretInput';
import { SlackSetupInstructions } from './SlackSetupInstructions';
import { WebhookUrlDisplay } from './WebhookUrlDisplay';

export function WebhookSettings() {
  // 1. Hooks
  const { data: webhookConfig, isLoading } = useWebhookConfig();
  const updateConfig = useUpdateWebhookConfig();
  const { data: hubStatus } = useHubStatus();

  const [slackBotToken, setSlackBotToken] = useState('');
  const [slackSigningSecret, setSlackSigningSecret] = useState('');
  const [githubWebhookSecret, setGithubWebhookSecret] = useState('');
  const [showSlackToken, setShowSlackToken] = useState(false);
  const [showSlackSecret, setShowSlackSecret] = useState(false);
  const [showGithubSecret, setShowGithubSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSlackInstructions, setShowSlackInstructions] = useState(false);
  const [showGithubInstructions, setShowGithubInstructions] = useState(false);

  // 2. Derived state
  const hubUrl = hubStatus?.hubUrl ?? '';
  const hasHubUrl = hubUrl.length > 0;
  const slackWebhookUrl = hasHubUrl ? `${hubUrl}/api/webhooks/slack/commands` : '';
  const githubWebhookUrl = hasHubUrl ? `${hubUrl}/api/webhooks/github` : '';
  const isSlackConfigured = webhookConfig?.slack.configured === true;
  const isGithubConfigured = webhookConfig?.github.configured === true;

  // 3. Handlers
  const handleCopy = useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  }, []);

  function handleSaveSlack() {
    updateConfig.mutate({
      slack: {
        botToken: slackBotToken.length > 0 ? slackBotToken : undefined,
        signingSecret: slackSigningSecret.length > 0 ? slackSigningSecret : undefined,
      },
    });
    setSlackBotToken('');
    setSlackSigningSecret('');
  }

  function handleSaveGithub() {
    updateConfig.mutate({
      github: { webhookSecret: githubWebhookSecret.length > 0 ? githubWebhookSecret : undefined },
    });
    setGithubWebhookSecret('');
  }

  // 4. Render
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4">
        <Spinner className="text-muted-foreground" size="sm" />
        <span className="text-sm">Loading webhook configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-foreground text-lg font-semibold">Assistant &amp; Webhooks</h3>
        <p className="text-muted-foreground text-sm">
          Configure Slack and GitHub integrations for external task creation.
        </p>
      </div>

      {/* Slack Integration */}
      <div className="border-border rounded-lg border p-4">
        <h4 className="text-foreground mb-3 text-sm font-semibold">Slack Integration</h4>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isSlackConfigured ? 'bg-success' : 'bg-muted-foreground',
            )}
          />
          <span className="text-muted-foreground text-xs">
            {isSlackConfigured ? 'Configured' : 'Not configured'}
          </span>
        </div>

        <CollapsibleInstructions
          isOpen={showSlackInstructions}
          title="Setup Instructions"
          onToggle={() => {
            setShowSlackInstructions(!showSlackInstructions);
          }}
        >
          <SlackSetupInstructions />
        </CollapsibleInstructions>

        <div className="mt-4 space-y-3">
          <SecretInput
            id="slack-bot-token"
            isVisible={showSlackToken}
            label="Bot Token (xoxb-...)"
            placeholder={isSlackConfigured ? '******** (saved)' : 'xoxb-your-bot-token'}
            value={slackBotToken}
            onChange={setSlackBotToken}
            onToggleVisibility={() => {
              setShowSlackToken(!showSlackToken);
            }}
          />
          <SecretInput
            id="slack-signing-secret"
            isVisible={showSlackSecret}
            label="Signing Secret"
            placeholder={isSlackConfigured ? '******** (saved)' : 'Your signing secret'}
            value={slackSigningSecret}
            onChange={setSlackSigningSecret}
            onToggleVisibility={() => {
              setShowSlackSecret(!showSlackSecret);
            }}
          />
          <Button
            disabled={slackBotToken.length === 0 && slackSigningSecret.length === 0}
            variant="primary"
            onClick={handleSaveSlack}
          >
            Save Slack Settings
          </Button>
          {hasHubUrl ? (
            <WebhookUrlDisplay
              copiedField={copiedField}
              fieldKey="slack"
              label="Webhook URL (copy to Slack App settings):"
              url={slackWebhookUrl}
              onCopy={handleCopy}
            />
          ) : (
            <p className="text-muted-foreground text-xs">
              Connect to a Hub server to get your webhook URL.
            </p>
          )}
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="border-border rounded-lg border p-4">
        <h4 className="text-foreground mb-3 text-sm font-semibold">GitHub Integration</h4>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isGithubConfigured ? 'bg-success' : 'bg-muted-foreground',
            )}
          />
          <span className="text-muted-foreground text-xs">
            {isGithubConfigured ? 'Configured' : 'Not configured'}
          </span>
        </div>

        <CollapsibleInstructions
          isOpen={showGithubInstructions}
          title="Setup Instructions"
          onToggle={() => {
            setShowGithubInstructions(!showGithubInstructions);
          }}
        >
          <GitHubSetupInstructions />
        </CollapsibleInstructions>

        <div className="mt-4 space-y-3">
          <SecretInput
            id="github-webhook-secret"
            isVisible={showGithubSecret}
            label="Webhook Secret"
            placeholder={isGithubConfigured ? '******** (saved)' : 'Your webhook secret'}
            value={githubWebhookSecret}
            onChange={setGithubWebhookSecret}
            onToggleVisibility={() => {
              setShowGithubSecret(!showGithubSecret);
            }}
          />
          <Button
            disabled={githubWebhookSecret.length === 0}
            variant="primary"
            onClick={handleSaveGithub}
          >
            Save GitHub Settings
          </Button>
          {hasHubUrl ? (
            <WebhookUrlDisplay
              copiedField={copiedField}
              fieldKey="github"
              label="Webhook URL (copy to GitHub repo settings):"
              url={githubWebhookUrl}
              onCopy={handleCopy}
            />
          ) : (
            <p className="text-muted-foreground text-xs">
              Connect to a Hub server to get your webhook URL.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
