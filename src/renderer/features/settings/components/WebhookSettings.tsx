/**
 * WebhookSettings — Webhook configuration section for the Settings page
 *
 * Configures Slack and GitHub webhook credentials, displays computed webhook
 * URLs from the Hub URL setting, and provides copy-to-clipboard functionality.
 */

import { useCallback, useState } from 'react';

import { Check, ClipboardCopy, Eye, EyeOff, Loader2 } from 'lucide-react';

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

function SecretInput({ id, label, placeholder, value, isVisible, onToggleVisibility, onChange }: SecretInputProps) {
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
          onChange={(e) => { onChange(e.target.value); }}
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
    setTimeout(() => { setCopiedField(null); }, 2000);
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
          <span className={cn('h-2 w-2 rounded-full', isSlackConfigured ? 'bg-success' : 'bg-muted-foreground')} />
          <span className="text-muted-foreground text-xs">
            {isSlackConfigured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          <SecretInput
            id="slack-bot-token"
            isVisible={showSlackToken}
            label="Bot Token (xoxb-...)"
            placeholder={isSlackConfigured ? '******** (saved)' : 'xoxb-your-bot-token'}
            value={slackBotToken}
            onChange={setSlackBotToken}
            onToggleVisibility={() => { setShowSlackToken(!showSlackToken); }}
          />
          <SecretInput
            id="slack-signing-secret"
            isVisible={showSlackSecret}
            label="Signing Secret"
            placeholder={isSlackConfigured ? '******** (saved)' : 'Your signing secret'}
            value={slackSigningSecret}
            onChange={setSlackSigningSecret}
            onToggleVisibility={() => { setShowSlackSecret(!showSlackSecret); }}
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
            <p className="text-muted-foreground text-xs">Connect to a Hub server to get your webhook URL.</p>
          )}
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="border-border rounded-lg border p-4">
        <h4 className="text-foreground mb-3 text-sm font-semibold">GitHub Integration</h4>
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', isGithubConfigured ? 'bg-success' : 'bg-muted-foreground')} />
          <span className="text-muted-foreground text-xs">
            {isGithubConfigured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          <SecretInput
            id="github-webhook-secret"
            isVisible={showGithubSecret}
            label="Webhook Secret"
            placeholder={isGithubConfigured ? '******** (saved)' : 'Your webhook secret'}
            value={githubWebhookSecret}
            onChange={setGithubWebhookSecret}
            onToggleVisibility={() => { setShowGithubSecret(!showGithubSecret); }}
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
            <p className="text-muted-foreground text-xs">Connect to a Hub server to get your webhook URL.</p>
          )}
        </div>
      </div>
    </div>
  );
}
