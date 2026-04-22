/**
 * useProfileFormModal — logic hook for ProfileFormModal
 */

import { useEffect, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { CLAUDE_MODELS } from '@shared/constants';
import type { Profile } from '@shared/types';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  apiKey: z.string(),
  model: z.string(),
});

export const MODEL_OPTIONS = [
  { label: 'No model selected', value: '__none__' },
  ...CLAUDE_MODELS.map((m) => ({ label: m.label, value: m.id })),
];

interface UseProfileFormModalProps {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSave: (data: { name: string; apiKey?: string; model?: string }) => void;
}

export function useProfileFormModal({ open, profile, onClose, onSave }: UseProfileFormModalProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const isEditing = profile !== null;

  const form = useForm({
    defaultValues: {
      name: '',
      apiKey: '',
      model: '',
    },
    validators: {
      onChange: profileSchema,
    },
    onSubmit: ({ value }) => {
      const trimmedName = value.name.trim();
      if (trimmedName.length === 0) {
        return;
      }
      onSave({
        name: trimmedName,
        apiKey: value.apiKey.length > 0 ? value.apiKey : undefined,
        model: value.model.length > 0 && value.model !== '__none__' ? value.model : undefined,
      });
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      form.setFieldValue('name', profile?.name ?? '');
      form.setFieldValue('apiKey', profile?.apiKey ?? '');
      form.setFieldValue('model', profile?.model ?? '');
      setShowApiKey(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset form when dialog opens
  }, [open, profile]);

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    void form.handleSubmit();
  }

  return {
    form,
    showApiKey,
    setShowApiKey,
    isEditing,
    handleFormSubmit,
    onClose,
  };
}
