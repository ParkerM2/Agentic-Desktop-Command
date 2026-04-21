/**
 * useLoginPage — all logic for LoginPage
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { useLogin } from '../../api/useAuth';
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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const login = useLogin();
  const { logins: savedLogins, saveLogin, removeLogin } = useSavedLogins();

  const isCoolingDown = cooldownRemaining > 0;

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

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

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
