/**
 * useWebhookSettings — logic hook for WebhookSettings
 */

import { useCallback, useState } from 'react';

import { useHubStatus } from '../../api/useHub';
import { useUpdateWebhookConfig, useWebhookConfig } from '../../api/useWebhookConfig';

export function useWebhookSettings() {
  const { data: webhookConfig, isLoading } = useWebhookConfig();
  const updateConfig = useUpdateWebhookConfig();
  const { data: hubStatus } = useHubStatus();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSlackInstructions, setShowSlackInstructions] = useState(false);
  const [showGithubInstructions, setShowGithubInstructions] = useState(false);

  const hubUrl = hubStatus?.hubUrl ?? '';
  const hasHubUrl = hubUrl.length > 0;
  const slackWebhookUrl = hasHubUrl ? `${hubUrl}/api/webhooks/slack/commands` : '';
  const githubWebhookUrl = hasHubUrl ? `${hubUrl}/api/webhooks/github` : '';
  const isSlackConfigured = webhookConfig?.slack.configured === true;
  const isGithubConfigured = webhookConfig?.github.configured === true;

  const handleCopy = useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  }, []);

  function handleSaveSlack(data: { botToken?: string; signingSecret?: string }) {
    updateConfig.mutate({
      slack: {
        botToken: data.botToken,
        signingSecret: data.signingSecret,
      },
    });
  }

  function handleSaveGithub(data: { webhookSecret?: string }) {
    updateConfig.mutate({
      github: { webhookSecret: data.webhookSecret },
    });
  }

  return {
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
  };
}
