/**
 * ProfileFormModal — Create or edit a profile
 */

import { useState, useEffect } from 'react';

import { Eye, EyeOff, X } from 'lucide-react';

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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

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
          <form className="space-y-4 p-4" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <Label htmlFor="profile-name">
                Name
              </Label>
              <Input
                className="mt-1"
                id="profile-name"
                placeholder="My Profile"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            {/* API Key */}
            <div>
              <Label htmlFor="profile-api-key">
                API Key
              </Label>
              <div className="relative mt-1">
                <Input
                  className="pr-10"
                  id="profile-api-key"
                  placeholder="sk-ant-..."
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
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
            </div>

            {/* Model */}
            <div>
              <Label htmlFor="profile-model">
                Model
              </Label>
              <Select value={model} onValueChange={(v) => setModel(v)}>
                <SelectTrigger className="mt-1" id="profile-model">
                  <SelectValue placeholder="No model selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No model selected</SelectItem>
                  {CLAUDE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={name.trim().length === 0}
                type="submit"
                variant="primary"
              >
                {isEditing ? 'Save Changes' : 'Create Profile'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
