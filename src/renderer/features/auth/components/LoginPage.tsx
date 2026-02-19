/**
 * Login page — full-page centered form with email/password and link to register
 */

import { useState } from 'react';

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Input, Label, Spinner } from '@ui';

import { useLogin } from '../api/useAuth';

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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xl font-bold text-primary">C</span>
          </div>
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to continue
          </p>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email">
                Email
              </Label>
              <Input
                required
                autoComplete="email"
                id="login-email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">
                Password
              </Label>
              <Input
                required
                autoComplete="current-password"
                id="login-password"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); }}
              />
            </div>

            {login.isError ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {login.error instanceof Error ? login.error.message : 'Login failed'}
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={!isFormValid || login.isPending}
              type="submit"
              variant="primary"
            >
              {login.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Button
              className="h-auto p-0 font-medium"
              type="button"
              variant="link"
              onClick={onNavigateToRegister}
            >
              Sign up
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
