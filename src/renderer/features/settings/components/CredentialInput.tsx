/**
 * CredentialInput — Labeled text input with validation error display.
 * Used by OAuthProviderForm for clientId and clientSecret fields.
 */

import { AlertCircle } from 'lucide-react';

import { Input, Label } from '@ui';

interface CredentialInputProps {
  id: string;
  label: string;
  placeholder: string;
  type: 'password' | 'text';
  value: string;
  error: string | null;
  showError: boolean;
  onChange: (value: string) => void;
}

export function CredentialInput({
  id,
  label,
  placeholder,
  type,
  value,
  error,
  showError,
  onChange,
}: CredentialInputProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <Label className="mb-1 block text-xs" htmlFor={id}>
        {label}
      </Label>
      <Input
        aria-describedby={showError ? errorId : undefined}
        aria-invalid={showError}
        id={id}
        placeholder={placeholder}
        type={type}
        value={value}
        variant={showError ? 'error' : 'default'}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
      {showError ? (
        <p className="text-destructive mt-1 flex items-center gap-1 text-xs" id={errorId}>
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
