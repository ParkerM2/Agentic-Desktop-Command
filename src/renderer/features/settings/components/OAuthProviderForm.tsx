/**
 * OAuthProviderForm — Credential entry form for a single OAuth provider.
 * Includes developer console link, required scopes, and input validation.
 */

import { useState } from 'react';

import { Key } from 'lucide-react';

import { Button, Spinner } from '@ui';

import { CredentialInput } from './CredentialInput';
import { ICON_SIZE, PROVIDER_CONFIG, validateCredentials } from './oauth-provider-constants';
import { ProviderConsoleInfo } from './ProviderConsoleInfo';

import type { ValidationState } from './oauth-provider-constants';

interface OAuthProviderFormProps {
  name: string;
  onSave: (clientId: string, clientSecret: string) => void;
  isPending: boolean;
}

export function OAuthProviderForm({ name, onSave, isPending }: OAuthProviderFormProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [validation, setValidation] = useState<ValidationState>({
    clientIdError: null,
    clientSecretError: null,
  });
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const config = PROVIDER_CONFIG[name];

  function handleSubmit() {
    setHasAttemptedSubmit(true);
    const validationResult = validateCredentials(clientId, clientSecret);
    setValidation(validationResult);

    if (validationResult.clientIdError === null && validationResult.clientSecretError === null) {
      onSave(clientId.trim(), clientSecret.trim());
    }
  }

  function handleClientIdChange(value: string) {
    setClientId(value);
    if (hasAttemptedSubmit) {
      const result = validateCredentials(value, clientSecret);
      setValidation((prev) => ({ ...prev, clientIdError: result.clientIdError }));
    }
  }

  function handleClientSecretChange(value: string) {
    setClientSecret(value);
    if (hasAttemptedSubmit) {
      const result = validateCredentials(clientId, value);
      setValidation((prev) => ({ ...prev, clientSecretError: result.clientSecretError }));
    }
  }

  return (
    <div className="mt-3 space-y-4">
      {config ? <ProviderConsoleInfo config={config} /> : null}

      <CredentialInput
        error={validation.clientIdError}
        id={`${name}-client-id`}
        label="Client ID"
        placeholder="Enter client ID"
        showError={hasAttemptedSubmit ? validation.clientIdError !== null : false}
        type="text"
        value={clientId}
        onChange={handleClientIdChange}
      />

      <CredentialInput
        error={validation.clientSecretError}
        id={`${name}-client-secret`}
        label="Client Secret"
        placeholder="Enter client secret"
        showError={hasAttemptedSubmit ? validation.clientSecretError !== null : false}
        type="password"
        value={clientSecret}
        onChange={handleClientSecretChange}
      />

      <Button
        disabled={isPending}
        variant="primary"
        onClick={handleSubmit}
      >
        {isPending ? (
          <Spinner size="sm" />
        ) : (
          <Key className={ICON_SIZE} />
        )}
        Save Credentials
      </Button>
    </div>
  );
}
