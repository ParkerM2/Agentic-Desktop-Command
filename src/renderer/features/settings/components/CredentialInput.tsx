/**
 * CredentialInput — Labeled text input with validation error display.
 * Used by OAuthProviderForm for clientId and clientSecret fields.
 */

import { AlertCircle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

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
      <label className="text-foreground mb-1 block text-xs font-medium" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={showError ? errorId : undefined}
        aria-invalid={showError}
        id={id}
        placeholder={placeholder}
        type={type}
        value={value}
        className={cn(
          'border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none',
          showError && 'border-destructive focus:border-destructive focus:ring-destructive',
        )}
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
