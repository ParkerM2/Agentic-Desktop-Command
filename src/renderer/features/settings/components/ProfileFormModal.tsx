/**
 * ProfileFormModal — Create or edit a profile
 */

import { useState, useEffect } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { X, Eye, EyeOff } from 'lucide-react';

import type { Profile } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

const MODEL_OPTIONS = [
  { value: '', label: 'No model selected' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
] as const;

interface ProfileFormModalProps {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSave: (data: { name: string; apiKey?: string; model?: string }) => void;
}

export function ProfileFormModal({ open, profile, onClose, onSave }: ProfileFormModalProps) {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const isEditing = profile !== null;

  useEffect(() => {
    if (open) {
      setName(profile?.name ?? '');
      setApiKey(profile?.apiKey ?? '');
      setModel(profile?.model ?? '');
      setShowApiKey(false);
    }
  }, [open, profile]);

  function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return;
    }
    onSave({
      name: trimmedName,
      apiKey: apiKey.length > 0 ? apiKey : undefined,
      model: model.length > 0 ? model : undefined,
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'bg-background border-border fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border shadow-2xl',
          )}
        >
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-4">
            <Dialog.Title className="text-lg font-semibold">
              {isEditing ? 'Edit Profile' : 'New Profile'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form className="space-y-4 p-4" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <label className="text-sm font-medium" htmlFor="profile-name">
                Name
              </label>
              <input
                id="profile-name"
                placeholder="My Profile"
                type="text"
                value={name}
                className={cn(
                  'border-border bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm',
                  'focus:border-primary focus:ring-ring focus:ring-1 focus:outline-none',
                  'placeholder:text-muted-foreground',
                )}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            {/* API Key */}
            <div>
              <label className="text-sm font-medium" htmlFor="profile-api-key">
                API Key
              </label>
              <div className="relative mt-1">
                <input
                  id="profile-api-key"
                  placeholder="sk-ant-..."
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  className={cn(
                    'border-border bg-background w-full rounded-md border px-3 py-2 pr-10 text-sm',
                    'focus:border-primary focus:ring-ring focus:ring-1 focus:outline-none',
                    'placeholder:text-muted-foreground',
                  )}
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <button
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
                  type="button"
                  onClick={() => setShowApiKey((previous) => !previous)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="text-sm font-medium" htmlFor="profile-model">
                Model
              </label>
              <select
                id="profile-model"
                value={model}
                className={cn(
                  'border-border bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm',
                  'focus:border-primary focus:ring-ring focus:ring-1 focus:outline-none',
                )}
                onChange={(event) => setModel(event.target.value)}
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={cn(
                  'border-border text-muted-foreground rounded-md border px-4 py-2 text-sm',
                  'hover:bg-accent hover:text-foreground',
                )}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                disabled={name.trim().length === 0}
                type="submit"
                className={cn(
                  'bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium',
                  'hover:bg-primary/90 disabled:opacity-50',
                )}
              >
                {isEditing ? 'Save Changes' : 'Create Profile'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
