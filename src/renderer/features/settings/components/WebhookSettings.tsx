/**
 * WebhookSettings — Webhook configuration section for the Settings page
 *
 * Configures Slack and GitHub webhook credentials, displays computed webhook
 * URLs from the Hub URL setting, and provides copy-to-clipboard functionality.
 * Includes collapsible setup instructions for each webhook type.
 */

import { useCallback, useState } from 'react';

import {
  Check,
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useHubStatus } from '../api/useHub';
import { useUpdateWebhookConfig, useWebhookConfig } from '../api/useWebhookConfig';

// ── Constants ───────────────────────────────────────────────

const INPUT_CLASS =
  'border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm pr-10 focus:ring-1 focus:outline-none';

const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors';

const SAVE_BUTTON_CLASS = cn(
  BUTTON_BASE,
  'bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
);

// ── Sub-components ──────────────────────────────────────────

interface SecretInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onChange: (value: string) => void;
}

function SecretInput({
  id,
  label,
  placeholder,
  value,
  isVisible,
  onToggleVisibility,
  onChange,
}: SecretInputProps) {
  return (
    <div>
      <label className="text-foreground mb-1.5 block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          className={INPUT_CLASS}
          id={id}
          placeholder={placeholder}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
        <button
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
          type="button"
          onClick={onToggleVisibility}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

interface WebhookUrlDisplayProps {
  label: string;
  url: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

function WebhookUrlDisplay({ label, url, fieldKey, copiedField, onCopy }: WebhookUrlDisplayProps) {
  return (
    <div className="mt-2">
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <div className="border-border bg-background flex items-center gap-2 rounded-md border px-3 py-2">
        <code className="text-foreground min-w-0 flex-1 truncate text-xs">{url}</code>
        <button
          aria-label={`Copy ${fieldKey} webhook URL`}
          className="text-muted-foreground hover:text-foreground shrink-0 p-1"
          type="button"
          onClick={() => onCopy(url, fieldKey)}
        >
          {copiedField === fieldKey ? (
            <Check className="text-success h-4 w-4" />
          ) : (
            <ClipboardCopy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

interface CollapsibleInstructionsProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleInstructions({
  title,
  isOpen,
  onToggle,
  children,
}: CollapsibleInstructionsProps) {
  return (
    <div className="border-border bg-muted/30 mt-3 rounded-md border">
      <button
        aria-expanded={isOpen}
        className="hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
        type="button"
        onClick={onToggle}
      >
        <span className="text-muted-foreground text-xs font-medium">{title}</span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen ? <div className="border-border border-t px-3 py-3">{children}</div> : null}
    </div>
  );
}

function SlackSetupInstructions() {
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

function GitHubSetupInstructions() {
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

// ── Main component ──────────────────────────────────────────

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
        <Loader2 className="h-4 w-4 animate-spin" />
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
          <button
            className={SAVE_BUTTON_CLASS}
            disabled={slackBotToken.length === 0 && slackSigningSecret.length === 0}
            type="button"
            onClick={handleSaveSlack}
          >
            Save Slack Settings
          </button>
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
          <button
            className={SAVE_BUTTON_CLASS}
            disabled={githubWebhookSecret.length === 0}
            type="button"
            onClick={handleSaveGithub}
          >
            Save GitHub Settings
          </button>
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
