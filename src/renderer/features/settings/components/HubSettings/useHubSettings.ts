/**
 * useHubSettings — logic hook for HubSettings component and sub-components
 */

import { useCallback, useState } from 'react';

import { useDockerResetHub, useDockerSetupHub, useDockerStatus } from '@features/hub/api/useDocker';
import { validateHubUrl } from '@features/hub/lib/validateHubUrl';

import {
  useHubConnect,
  useHubDisconnect,
  useHubGenerateKey,
  useHubRemoveConfig,
  useHubStatus,
  useHubSync,
} from '../../api/useHub';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';

export function useHubSettings() {
  const { data: hubStatus, isLoading } = useHubStatus();
  const connectMutation = useHubConnect();
  const disconnectMutation = useHubDisconnect();
  const syncMutation = useHubSync();
  const removeConfigMutation = useHubRemoveConfig();
  const generateKeyMutation = useHubGenerateKey();

  const statusValue = hubStatus?.status ?? 'disconnected';
  const isConnected = statusValue === 'connected';
  const pendingCount = hubStatus?.pendingMutations ?? 0;

  return {
    hubStatus,
    isLoading,
    statusValue,
    isConnected,
    pendingCount,
    connectMutation,
    disconnectMutation,
    syncMutation,
    removeConfigMutation,
    generateKeyMutation,
  };
}

// ── AutoSetupPanel logic ──────────────────────────────────────

interface UseAutoSetupPanelParams {
  onConnected: (url: string, apiKey: string) => void;
}

export function useAutoSetupPanel({ onConnected }: UseAutoSetupPanelParams) {
  const { data: dockerStatus } = useDockerStatus();
  const setupMutation = useDockerSetupHub();
  const resetMutation = useDockerResetHub();
  const { error, setError, execute } = useAsyncOperation();
  const [showReset, setShowReset] = useState(false);

  const docker = dockerStatus ?? { installed: false, running: false };
  const dockerReady = docker.installed && docker.running;
  const busy = setupMutation.isPending || resetMutation.isPending;

  let dockerHint: string | null = null;
  if (!docker.installed) {
    dockerHint = 'Docker Desktop is not installed. Install it from docker.com, then retry.';
  } else if (!docker.running) {
    dockerHint = 'Docker Desktop is installed but not running. Start it, then retry.';
  }

  const handleSetup = useCallback(async () => {
    setShowReset(false);
    const result = await execute(() => setupMutation.mutateAsync());
    if (!result) return;
    if (!result.success || !result.url || !result.apiKey) {
      setError(result.error ?? 'Setup failed.');
      if (result.step === 'api-key') {
        setShowReset(true);
      }
      return;
    }
    onConnected(result.url, result.apiKey);
  }, [setupMutation, onConnected, execute, setError]);

  const handleReset = useCallback(async () => {
    const result = await execute(() => resetMutation.mutateAsync());
    if (!result) return;
    if (!result.success || !result.url || !result.apiKey) {
      setError(result.error ?? 'Reset failed.');
      return;
    }
    setShowReset(false);
    onConnected(result.url, result.apiKey);
  }, [resetMutation, onConnected, execute, setError]);

  return {
    dockerReady,
    busy,
    isSettingUp: setupMutation.isPending,
    isResetting: resetMutation.isPending,
    error,
    showReset,
    dockerHint,
    handleSetup,
    handleReset,
  };
}

// ── GenerateKeyPanel logic ────────────────────────────────────

interface UseGenerateKeyPanelParams {
  hubUrl: string;
  onGenerated: (url: string, key: string) => void;
}

export function useGenerateKeyPanel({ hubUrl, onGenerated }: UseGenerateKeyPanelParams) {
  const { generateKeyMutation } = useHubSettings();
  const { error, setError } = useAsyncOperation();

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(hubUrl);
  const [secret, setSecret] = useState('');
  const [urlTouched, setUrlTouched] = useState(false);

  // Keep the generator URL in sync with the parent URL until the user overrides it
  if (!urlTouched && url !== hubUrl) {
    setUrl(hubUrl);
  }

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setUrlTouched(true);
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!url.trim()) {
      setError('Enter the Hub URL first.');
      return;
    }

    setError(null);
    let result: Awaited<ReturnType<typeof generateKeyMutation.mutateAsync>> | null = null;
    try {
      result = await generateKeyMutation.mutateAsync({
        url: url.trim(),
        bootstrapSecret: secret.trim(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Unknown IPC channel') || message.includes('No handler')) {
        setError(
          'Main process is running older code — restart `npm run dev` so the new handler loads.',
        );
      } else {
        setError(`Request failed: ${message}`);
      }
      return;
    }

    if (!result.success || !result.key) {
      setError(result.error ?? 'Failed to generate key.');
      return;
    }

    setSecret('');
    onGenerated(url.trim(), result.key);
  }, [url, secret, generateKeyMutation, onGenerated, setError]);

  return {
    open,
    toggleOpen,
    url,
    handleUrlChange,
    secret,
    setSecret,
    error,
    isGenerating: generateKeyMutation.isPending,
    handleGenerate,
  };
}

// ── ConnectionForm logic ──────────────────────────────────────

interface UseConnectionFormParams {
  isConnecting: boolean;
  onConnect: (url: string, apiKey: string) => void;
}

export function useConnectionForm({ isConnecting, onConnect }: UseConnectionFormParams) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isPending = isConnecting || isValidating;

  const getButtonLabel = useCallback((): string => {
    if (isValidating) return 'Validating...';
    if (isConnecting) return 'Connecting...';
    return 'Connect';
  }, [isValidating, isConnecting]);

  const handleFormSubmit = useCallback(
    async (value: { hubUrl: string; apiKey: string }) => {
      setValidationError(null);
      setIsValidating(true);

      const validation = await validateHubUrl(value.hubUrl);
      setIsValidating(false);

      if (!validation.reachable) {
        setValidationError(validation.error ?? 'Hub server is unreachable');
        return;
      }

      onConnect(value.hubUrl, value.apiKey);
    },
    [onConnect],
  );

  return {
    isValidating,
    validationError,
    isPending,
    getButtonLabel,
    handleFormSubmit,
  };
}
