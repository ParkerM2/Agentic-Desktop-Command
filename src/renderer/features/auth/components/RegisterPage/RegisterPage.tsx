/**
 * Register page — display name, email, password, confirm password.
 *
 * Uses TanStack Form + Zod validation + design system FormInput primitives.
 * Password confirmation is validated via a form-level Zod refinement.
 */

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Form, FormInput, InlineAlert, Spinner } from '@ui';

import { useRegisterPage } from './useRegisterPage';

interface RegisterPageProps {
  onNavigateToHubSetup: () => void;
  onNavigateToLogin: () => void;
  onSuccess: () => void;
}

export function RegisterPage({ onNavigateToHubSetup, onNavigateToLogin, onSuccess }: RegisterPageProps) {
  const { form, register, serverError, handleFormSubmit } = useRegisterPage({ onSuccess });

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
          <Form className="space-y-4" onSubmit={handleFormSubmit}>
            <form.Field name="displayName">
              {(field) => (
                <FormInput
                  required
                  field={field}
                  label="Display Name"
                  placeholder="Your name"
                  type="text"
                />
              )}
            </form.Field>

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
                  placeholder="Choose a password (min 8 characters)"
                  type="password"
                />
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <FormInput
                  required
                  field={field}
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  type="password"
                />
              )}
            </form.Field>

            {serverError === null ? null : (
              <InlineAlert variant="error">{serverError}</InlineAlert>
            )}

            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Button
                  className="w-full"
                  disabled={!canSubmit || register.isPending}
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
              )}
            </form.Subscribe>
          </Form>
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
