/**
 * Register page — display name, email, password, confirm password
 */

import { useState } from 'react';

import { cn } from '@renderer/shared/lib/utils';

import { useRegister } from '../api/useAuth';

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

const MIN_PASSWORD_LENGTH = 8;

interface RegisterPageProps {
  onNavigateToHubSetup: () => void;
  onNavigateToLogin: () => void;
  onSuccess: () => void;
}

function getPasswordError(password: string, confirmPassword: string): string | null {
  if (password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${String(MIN_PASSWORD_LENGTH)} characters`;
  }
  if (confirmPassword.length > 0 && password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
}

export function RegisterPage({ onNavigateToHubSetup, onNavigateToLogin, onSuccess }: RegisterPageProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const register = useRegister();

  const passwordError = getPasswordError(password, confirmPassword);

  const isFormValid =
    displayName.length > 0 &&
    email.length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword.length > 0 &&
    passwordError === null;

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isFormValid) return;
    register.mutate(
      { email, password, displayName },
      { onSuccess },
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xl font-bold text-primary">C</span>
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details to get started
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="register-name">
              Display Name
            </label>
            <input
              required
              autoComplete="name"
              className={INPUT_CLASS}
              id="register-name"
              placeholder="Your name"
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="register-email">
              Email
            </label>
            <input
              required
              autoComplete="email"
              className={INPUT_CLASS}
              id="register-email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="register-password">
              Password
            </label>
            <input
              required
              autoComplete="new-password"
              className={INPUT_CLASS}
              id="register-password"
              minLength={MIN_PASSWORD_LENGTH}
              placeholder="Choose a password (min 8 characters)"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="register-confirm">
              Confirm Password
            </label>
            <input
              required
              autoComplete="new-password"
              id="register-confirm"
              placeholder="Re-enter your password"
              type="password"
              value={confirmPassword}
              className={cn(
                INPUT_CLASS,
                passwordError === null ? '' : 'border-destructive',
              )}
              onChange={(e) => { setConfirmPassword(e.target.value); }}
            />
            {passwordError === null ? null : (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
          </div>

          {register.isError ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {register.error instanceof Error ? register.error.message : 'Registration failed'}
            </div>
          ) : null}

          <button
            disabled={!isFormValid || register.isPending}
            type="submit"
            className={cn(
              'w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {register.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            className="font-medium text-primary underline-offset-4 hover:underline"
            type="button"
            onClick={onNavigateToLogin}
          >
            Sign in
          </button>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          <button
            className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            type="button"
            onClick={onNavigateToHubSetup}
          >
            Change Hub server
          </button>
        </p>
      </div>
    </div>
  );
}
