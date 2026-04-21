/**
 * useLoginPage — all logic for LoginPage
 */

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { useLogin } from '../../api/useAuth';
import { useCooldown } from '../../hooks/useCooldown';
import { useSavedLogins } from '../../hooks/useSavedLogins';

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

interface UseLoginPageParams {
  onSuccess: () => void;
}

export function useLoginPage({ onSuccess }: UseLoginPageParams) {
  const login = useLogin();
  const { logins: savedLogins, saveLogin, removeLogin } = useSavedLogins();
  const { failedAttempts, cooldownRemaining, isCoolingDown, recordFailure } = useCooldown(
    MAX_ATTEMPTS,
    COOLDOWN_SECONDS,
  );

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
          recordFailure();
        },
      });
    },
  });

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    void form.handleSubmit();
  }

  return {
    form,
    login,
    savedLogins,
    removeLogin,
    failedAttempts,
    isCoolingDown,
    cooldownRemaining,
    handleFormSubmit,
    MAX_ATTEMPTS,
  };
}
