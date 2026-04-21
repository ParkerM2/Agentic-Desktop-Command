import { useState } from 'react';

import { useHubConnect } from '@features/settings/api/useHub';

import { useDockerSetupHub, useDockerStatus } from '../../api/useDocker';
import { validateHubUrl } from '../../lib/validateHubUrl';

export function useHubSetupPage(onSuccess: () => void) {
  const [showManual, setShowManual] = useState(false);
  const [hubUrl, setHubUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generateKeyError, setGenerateKeyError] = useState<string | null>(null);

  const dockerStatus = useDockerStatus();
  const setupMutation = useDockerSetupHub();
  const connectMutation = useHubConnect();

  const isFormValid = hubUrl.length > 0 && apiKey.length > 0;
  const isManualPending = isValidating || connectMutation.isPending;
  const isAutoSetupPending =
    setupMutation.isPending || (connectMutation.isPending && setupMutation.isSuccess);

  function handleAutoSetup() {
    setupMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success && result.url && result.apiKey) {
          connectMutation.mutate(
            { url: result.url, apiKey: result.apiKey },
            { onSuccess },
          );
        }
      },
    });
  }

  async function handleManualConnect() {
    if (!isFormValid) return;

    setValidationError(null);
    setIsValidating(true);

    const validation = await validateHubUrl(hubUrl);
    setIsValidating(false);

    if (!validation.reachable) {
      setValidationError(validation.error ?? 'Hub server is unreachable');
      return;
    }

    connectMutation.mutate(
      { url: hubUrl, apiKey },
      { onSuccess },
    );
  }

  async function handleGenerateKey() {
    if (hubUrl.length === 0) {
      setGenerateKeyError('Enter the Hub URL first');
      return;
    }
    setGenerateKeyError(null);
    setIsGeneratingKey(true);
    try {
      const cleanUrl = hubUrl.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/auth/generate-key`, { method: 'POST' });
      if (!response.ok) {
        const body = await response.text();
        setGenerateKeyError(`Failed (${String(response.status)}): ${body}`);
        return;
      }
      const data = (await response.json()) as { key: string };
      setApiKey(data.key);
    } catch (error) {
      setGenerateKeyError(error instanceof Error ? error.message : 'Failed to reach Hub server');
    } finally {
      setIsGeneratingKey(false);
    }
  }

  function getAutoSetupLabel(): string {
    if (setupMutation.isPending) return 'Setting up Hub...';
    if (connectMutation.isPending && setupMutation.isSuccess) return 'Connecting...';
    return 'Set Up Hub Automatically';
  }

  function getManualButtonLabel(): string {
    if (isValidating) return 'Checking connection...';
    if (connectMutation.isPending && !setupMutation.isSuccess) return 'Connecting...';
    return 'Connect';
  }

  const showManualConnectError =
    connectMutation.isError && validationError === null && !setupMutation.isSuccess;

  return {
    showManual,
    setShowManual,
    hubUrl,
    setHubUrl,
    apiKey,
    setApiKey,
    isValidating,
    validationError,
    isGeneratingKey,
    generateKeyError,
    dockerStatus,
    setupMutation,
    connectMutation,
    isFormValid,
    isManualPending,
    isAutoSetupPending,
    showManualConnectError,
    handleAutoSetup,
    handleManualConnect,
    handleGenerateKey,
    getAutoSetupLabel,
    getManualButtonLabel,
  };
}
