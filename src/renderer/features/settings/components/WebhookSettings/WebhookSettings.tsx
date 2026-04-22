/**
 * WebhookSettings — Webhook configuration section for the Settings page
 *
 * Configures Slack and GitHub webhook credentials, displays computed webhook
 * URLs from the Hub URL setting, and provides copy-to-clipboard functionality.
 * Includes collapsible setup instructions for each webhook type.
 *
 * Uses TanStack Form + Zod validation for both Slack and GitHub sections.
 */

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Form, FormInput, Heading, Spinner } from '@ui';

import { CollapsibleInstructions } from '../CollapsibleInstructions';
import { GitHubSetupInstructions } from '../GitHubSetupInstructions';
import { SlackSetupInstructions } from '../SlackSetupInstructions';
import { WebhookUrlDisplay } from '../WebhookUrlDisplay';

import { useWebhookSettings } from './useWebhookSettings';

// ── Schemas ────────────────────────────────────────────────

const slackSchema = z.object({
  botToken: z.string(),
  signingSecret: z.string(),
});

const githubSchema = z.object({
  webhookSecret: z.string().min(1, 'Webhook secret is required'),
});

// ── Slack Form ─────────────────────────────────────────────

interface SlackFormProps {
  isConfigured: boolean;
  onSave: (data: { botToken?: string; signingSecret?: string }) => void;
}

function SlackForm({ isConfigured, onSave }: SlackFormProps) {
  const form = useForm({
    defaultValues: {
      botToken: '',
      signingSecret: '',
    },
    validators: {
      onChange: slackSchema,
    },
    onSubmit: ({ value }) => {
      onSave({
        botToken: value.botToken.length > 0 ? value.botToken : undefined,
        signingSecret: value.signingSecret.length > 0 ? value.signingSecret : undefined,
      });
      form.reset();
    },
  });

  const hasInput =
    form.state.values.botToken.length > 0 ||
    form.state.values.signingSecret.length > 0;

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    void form.handleSubmit();
  }

  return (
    <Form className="space-y-3" onSubmit={handleFormSubmit}>
      <form.Field name="botToken">
        {(field) => (
          <FormInput
            field={field}
            label="Bot Token (xoxb-...)"
            placeholder={isConfigured ? '******** (saved)' : 'xoxb-your-bot-token'}
            type="password"
          />
        )}
      </form.Field>

      <form.Field name="signingSecret">
        {(field) => (
          <FormInput
            field={field}
            label="Signing Secret"
            placeholder={isConfigured ? '******** (saved)' : 'Your signing secret'}
            type="password"
          />
        )}
      </form.Field>

      <Button
        disabled={!hasInput}
        type="submit"
        variant="primary"
      >
        Save Slack Settings
      </Button>
    </Form>
  );
}

// ── GitHub Form ────────────────────────────────────────────

interface GitHubFormProps {
  isConfigured: boolean;
  onSave: (data: { webhookSecret?: string }) => void;
}

function GitHubForm({ isConfigured, onSave }: GitHubFormProps) {
  const form = useForm({
    defaultValues: {
      webhookSecret: '',
    },
    validators: {
      onChange: githubSchema,
    },
    onSubmit: ({ value }) => {
      onSave({
        webhookSecret: value.webhookSecret.length > 0 ? value.webhookSecret : undefined,
      });
      form.reset();
    },
  });

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    void form.handleSubmit();
  }

  return (
    <Form className="space-y-3" onSubmit={handleFormSubmit}>
      <form.Field name="webhookSecret">
        {(field) => (
          <FormInput
            required
            field={field}
            label="Webhook Secret"
            placeholder={isConfigured ? '******** (saved)' : 'Your webhook secret'}
            type="password"
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit]}>
        {([canSubmit]) => (
          <Button
            disabled={!canSubmit || form.state.values.webhookSecret.length === 0}
            type="submit"
            variant="primary"
          >
            Save GitHub Settings
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
}

// ── Main component ─────────────────────────────────────────

export function WebhookSettings() {
  const {
    isLoading,
    copiedField,
    showSlackInstructions,
    setShowSlackInstructions,
    showGithubInstructions,
    setShowGithubInstructions,
    hasHubUrl,
    slackWebhookUrl,
    githubWebhookUrl,
    isSlackConfigured,
    isGithubConfigured,
    handleCopy,
    handleSaveSlack,
    handleSaveGithub,
  } = useWebhookSettings();

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
        <Heading as="h3">Assistant &amp; Webhooks</Heading>
        <p className="text-muted-foreground text-sm">
          Configure Slack and GitHub integrations for external task creation.
        </p>
      </div>

      {/* Slack Integration */}
      <div className="border-border rounded-lg border p-4">
        <Heading as="h4" className="mb-3 text-sm">Slack Integration</Heading>
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

        <div className="mt-4">
          <SlackForm isConfigured={isSlackConfigured} onSave={handleSaveSlack} />
          {hasHubUrl ? (
            <div className="mt-3">
              <WebhookUrlDisplay
                copiedField={copiedField}
                fieldKey="slack"
                label="Webhook URL (copy to Slack App settings):"
                url={slackWebhookUrl}
                onCopy={handleCopy}
              />
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-xs">
              Connect to a Hub server to get your webhook URL.
            </p>
          )}
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="border-border rounded-lg border p-4">
        <Heading as="h4" className="mb-3 text-sm">GitHub Integration</Heading>
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

        <div className="mt-4">
          <GitHubForm isConfigured={isGithubConfigured} onSave={handleSaveGithub} />
          {hasHubUrl ? (
            <div className="mt-3">
              <WebhookUrlDisplay
                copiedField={copiedField}
                fieldKey="github"
                label="Webhook URL (copy to GitHub repo settings):"
                url={githubWebhookUrl}
                onCopy={handleCopy}
              />
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-xs">
              Connect to a Hub server to get your webhook URL.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
