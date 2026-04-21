/**
 * useRegisterPage — all logic for RegisterPage
 */

import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { useRegister } from '../../api/useAuth';

const MIN_PASSWORD_LENGTH = 8;

const registerSchema = z
  .object({
    displayName: z.string().min(1, 'Display name is required'),
    email: z.email('Enter a valid email address'),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${String(MIN_PASSWORD_LENGTH)} characters`),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

interface UseRegisterPageParams {
  onSuccess: () => void;
}

export function useRegisterPage({ onSuccess }: UseRegisterPageParams) {
  const [serverError, setServerError] = useState<string | null>(null);
  const register = useRegister();

  const form = useForm({
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: registerSchema,
    },
    onSubmit: ({ value }) => {
      setServerError(null);
      register.mutate(
        { email: value.email, password: value.password, displayName: value.displayName },
        {
          onSuccess,
          onError: (error: unknown) => {
            setServerError(error instanceof Error ? error.message : 'Registration failed');
          },
        },
      );
    },
  });

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    void form.handleSubmit();
  }

  return {
    form,
    register,
    serverError,
    handleFormSubmit,
  };
}
