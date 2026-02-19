/**
 * Login page — full-page centered form with email/password and link to register
 */

import { useState } from 'react';

import { cn } from '@renderer/shared/lib/utils';

import { useLogin } from '../api/useAuth';

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

interface LoginPageProps {
  onNavigateToHubSetup: () => void;
  onNavigateToRegister: () => void;
  onSuccess: () => void;
}

export function LoginPage({ onNavigateToHubSetup, onNavigateToRegister, onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess },
    );
  }

  const isFormValid = email.length > 0 && password.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xl font-bold text-primary">C</span>
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to continue
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="login-email">
              Email
            </label>
            <input
              required
              autoComplete="email"
              className={INPUT_CLASS}
              id="login-email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="login-password">
              Password
            </label>
            <input
              required
              autoComplete="current-password"
              className={INPUT_CLASS}
              id="login-password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
            />
          </div>

          {login.isError ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {login.error instanceof Error ? login.error.message : 'Login failed'}
            </div>
          ) : null}

          <button
            disabled={!isFormValid || login.isPending}
            type="submit"
            className={cn(
              'w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {login.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <button
            className="font-medium text-primary underline-offset-4 hover:underline"
            type="button"
            onClick={onNavigateToRegister}
          >
            Sign up
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
