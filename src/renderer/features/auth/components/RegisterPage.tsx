/**
 * Register page — display name, email, password, confirm password
 */

import { useState } from 'react';

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Input, Label, Spinner } from '@ui';

import { useRegister } from '../api/useAuth';

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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xl font-bold text-primary">C</span>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill in the details to get started
          </p>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="register-name">
                Display Name
              </Label>
              <Input
                required
                autoComplete="name"
                id="register-name"
                placeholder="Your name"
                type="text"
                value={displayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDisplayName(e.target.value); }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">
                Email
              </Label>
              <Input
                required
                autoComplete="email"
                id="register-email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">
                Password
              </Label>
              <Input
                required
                autoComplete="new-password"
                id="register-password"
                minLength={MIN_PASSWORD_LENGTH}
                placeholder="Choose a password (min 8 characters)"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirm">
                Confirm Password
              </Label>
              <Input
                required
                autoComplete="new-password"
                id="register-confirm"
                placeholder="Re-enter your password"
                type="password"
                value={confirmPassword}
                variant={passwordError === null ? 'default' : 'error'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setConfirmPassword(e.target.value); }}
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

            <Button
              className="w-full"
              disabled={!isFormValid || register.isPending}
              type="submit"
              variant="primary"
            >
              {register.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button
              className="h-auto p-0 font-medium"
              type="button"
              variant="link"
              onClick={onNavigateToLogin}
            >
              Sign in
            </Button>
          </p>

          <p className="text-center text-sm text-muted-foreground">
            <Button
              className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
              type="button"
              variant="link"
              onClick={onNavigateToHubSetup}
            >
              Change Hub server
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
