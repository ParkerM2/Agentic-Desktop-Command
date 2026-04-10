/**
 * Login page — full-page centered form with email/password and link to register.
 * Includes client-side rate limiting: after 5 consecutive failed attempts,
 * the submit button is disabled for 30 seconds.
 *
 * Uses TanStack Form + Zod validation + design system FormInput primitives.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { X } from 'lucide-react';
import { z } from 'zod';

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Form, FormInput, InlineAlert, Spinner } from '@ui';

import { useLogin } from '../api/useAuth';
import { useSavedLogins } from '../hooks/useSavedLogins';

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

interface LoginPageProps {
  onNavigateToHubSetup: () => void;
  onNavigateToRegister: () => void;
  onSuccess: () => void;
}

export function LoginPage({ onNavigateToHubSetup, onNavigateToRegister, onSuccess }: LoginPageProps) {
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const login = useLogin();
  const { logins: savedLogins, saveLogin, removeLogin } = useSavedLogins();

  const isCoolingDown = cooldownRemaining > 0;

  const form = useForm({
    defaultValues: {
      email: window.appInfo.devMode ? window.appInfo.devEmail : '',
      password: window.appInfo.devMode ? window.appInfo.devPassword : '',
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: ({ value }) => {
      if (isCoolingDown) return;

      login.mutate(value, {
        onSuccess: () => {
          saveLogin(value.email);
          onSuccess();
        },
        onError: () => {
          setFailedAttempts((prev) => {
            const next = prev + 1;
            if (next >= MAX_ATTEMPTS) {
              startCooldown();
            }
            return next;
          });
        },
      });
    },
  });

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldownRemaining(COOLDOWN_SECONDS);

    if (cooldownTimerRef.current !== null) {
      clearInterval(cooldownTimerRef.current);
    }

    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current !== null) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    void form.handleSubmit();
  }

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

        <CardContent className="space-y-4">
          {savedLogins.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Previous logins</p>
              <div className="flex flex-wrap gap-2">
                {savedLogins.map((saved) => (
                  <div
                    key={saved.email}
                    className="flex items-center gap-1 rounded-full border border-border bg-muted pl-3 pr-1 py-1 text-xs"
                  >
                    <Button
                      className="h-auto p-0 text-xs font-normal text-foreground hover:text-primary"
                      type="button"
                      variant="link"
                      onClick={() => {
                        form.setFieldValue('email', saved.email);
                      }}
                    >
                      {saved.email}
                    </Button>
                    <Button
                      aria-label={`Remove saved login for ${saved.email}`}
                      className="ml-1 size-4 rounded-full p-0 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => { removeLogin(saved.email); }}
                    >
                      <X size={10} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Form className="space-y-4" onSubmit={handleFormSubmit}>
            <form.Field name="email">
              {(field) => (
                <FormInput
                  required
                  field={field}
                  label="Email"
                  placeholder="you@example.com"
                  type="email"
                />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <FormInput
                  required
                  field={field}
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                />
              )}
            </form.Field>

            {login.isError && !isCoolingDown ? (
              <InlineAlert variant="error">
                {login.error instanceof Error ? login.error.message : 'Login failed'}
                {failedAttempts >= 3 && failedAttempts < MAX_ATTEMPTS ? (
                  <span className="mt-1 block text-xs opacity-80">
                    {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts === 1 ? '' : 's'} remaining before lockout
                  </span>
                ) : null}
              </InlineAlert>
            ) : null}

            {isCoolingDown ? (
              <InlineAlert variant="warning">
                Too many attempts. Try again in {cooldownRemaining}s
              </InlineAlert>
            ) : null}

            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Button
                  className="w-full"
                  disabled={!canSubmit || login.isPending || isCoolingDown}
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
              )}
            </form.Subscribe>
          </Form>
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
