/**
 * ProfileFormModal — Create or edit a profile
 *
 * Uses TanStack Form + Zod validation + design system FormInput/FormSelect primitives.
 */

import { useEffect, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { Eye, EyeOff, X } from 'lucide-react';
import { z } from 'zod';

import { CLAUDE_MODELS } from '@shared/constants';
import type { Profile } from '@shared/types';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  Form,
  FormField,
  FormInput,
  FormSelect,
  Input,
} from '@ui';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  apiKey: z.string(),
  model: z.string(),
});

const MODEL_OPTIONS = [
  { label: 'No model selected', value: '__none__' },
  ...CLAUDE_MODELS.map((m) => ({ label: m.label, value: m.id })),
];

interface ProfileFormModalProps {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSave: (data: { name: string; apiKey?: string; model?: string }) => void;
}

export function ProfileFormModal({ open, profile, onClose, onSave }: ProfileFormModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="w-full max-w-md">
          {/* Header */}
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Profile' : 'New Profile'}
            </DialogTitle>
            <DialogClose asChild>
              <Button aria-label="Close" size="icon" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          {/* Form */}
          <Form className="space-y-4 p-4" onSubmit={handleFormSubmit}>
            {/* Name */}
            <form.Field name="name">
              {(field) => (
                <FormInput
                  required
                  field={field}
                  label="Name"
                  placeholder="My Profile"
                  type="text"
                />
              )}
            </form.Field>

            {/* API Key — custom render for visibility toggle */}
            <form.Field name="apiKey">
              {(field) => (
                <FormField label="API Key">
                  <div className="relative">
                    <Input
                      className="pr-10"
                      name="apiKey"
                      placeholder="sk-ant-..."
                      type={showApiKey ? 'text' : 'password'}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        field.handleChange(e.target.value);
                      }}
                    />
                    <Button
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      className="absolute top-1/2 right-2 -translate-y-1/2"
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowApiKey((previous) => !previous)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormField>
              )}
            </form.Field>

            {/* Model */}
            <form.Field name="model">
              {(field) => (
                <FormSelect
                  field={field}
                  label="Model"
                  options={MODEL_OPTIONS}
                  placeholder="No model selected"
                />
              )}
            </form.Field>

            {/* Actions */}
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit]) => (
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!canSubmit}
                    type="submit"
                    variant="primary"
                  >
                    {isEditing ? 'Save Changes' : 'Create Profile'}
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
