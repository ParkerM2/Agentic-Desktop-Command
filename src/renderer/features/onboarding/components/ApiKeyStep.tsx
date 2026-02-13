/**
 * ApiKeyStep — Enter Anthropic API key
 *
 * Allows users to enter their API key during onboarding.
 */

import { useState } from 'react';

import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Key, Loader2 } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useSettings, useUpdateSettings } from '@features/settings';

// ── Constants ───────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors';

const INPUT_BASE =
  'border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-lg border px-4 py-3 pr-12 text-sm focus:ring-1 focus:outline-none';

// ── Types ───────────────────────────────────────────────────

interface ApiKeyStepProps {
  onNext: () => void;
  onBack: () => void;
}

// ── Component ───────────────────────────────────────────────

export function ApiKeyStep({ onNext, onBack }: ApiKeyStepProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [apiKey, setApiKey] = useState(settings?.anthropicApiKey ?? '');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExistingKey = (settings?.anthropicApiKey?.length ?? 0) > 0;
  const hasEnteredKey = apiKey.trim().length > 0;

  function handleSave() {
    const trimmedKey = apiKey.trim();

    // Basic validation
    if (trimmedKey.length === 0) {
      setError('Please enter an API key or skip this step');
      return;
    }

    if (!trimmedKey.startsWith('sk-ant-')) {
      setError('API key should start with "sk-ant-"');
      return;
    }

    if (trimmedKey.length < 20) {
      setError('API key appears to be too short');
      return;
    }

    setError(null);
    updateSettings.mutate(
      { anthropicApiKey: trimmedKey },
      {
        onSuccess() {
          onNext();
        },
        onError() {
          setError('Failed to save API key. Please try again.');
        },
      },
    );
  }

  function handleSkip() {
    onNext();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (hasEnteredKey) {
        handleSave();
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Key className="text-primary h-8 w-8" />
      </div>

      <h2 className="text-foreground mb-2 text-2xl font-bold">Anthropic API Key</h2>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        Enter your Anthropic API key to enable Claude-powered features. You can also set this up
        later in Settings.
      </p>

      {/* Input Card */}
      <div className="bg-card border-border mb-8 w-full max-w-md rounded-lg border p-6">
        <label className="text-foreground mb-2 block text-sm font-medium" htmlFor="api-key-input">
          API Key
        </label>

        <div className="relative">
          <input
            aria-describedby={error === null ? undefined : 'api-key-error'}
            aria-invalid={error !== null}
            className={cn(INPUT_BASE, error !== null && 'border-destructive focus:border-destructive')}
            id="api-key-input"
            placeholder="sk-ant-..."
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError(null);
            }}
          />
          <button
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            type="button"
            onClick={() => {
              setShowKey(!showKey);
            }}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error === null ? null : (
          <p className="text-destructive mt-2 flex items-center gap-1.5 text-sm" id="api-key-error">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        {hasExistingKey && !hasEnteredKey ? (
          <p className="text-success mt-2 text-sm">An API key is already configured.</p>
        ) : null}

        <p className="text-muted-foreground mt-4 text-xs">
          Get your API key from the{' '}
          <a
            className="text-primary hover:underline"
            href="https://console.anthropic.com/settings/keys"
            rel="noopener noreferrer"
            target="_blank"
          >
            Anthropic Console
          </a>
          . Your key is stored securely on your device.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          className={cn(BUTTON_BASE, 'border-border bg-background hover:bg-accent border')}
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {hasEnteredKey ? (
          <button
            disabled={updateSettings.isPending}
            type="button"
            className={cn(
              BUTTON_BASE,
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            onClick={handleSave}
          >
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Save & Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <button
            className={cn(BUTTON_BASE, 'bg-primary text-primary-foreground hover:bg-primary/90')}
            type="button"
            onClick={handleSkip}
          >
            {hasExistingKey ? 'Continue' : 'Skip for Now'}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
