/**
 * ProfileCard — Displays a single profile with actions
 */

import { Pencil, Star, Trash2 } from 'lucide-react';

import { MODEL_SHORT_LABELS } from '@shared/constants';
import type { Profile } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

interface ProfileCardProps {
  profile: Profile;
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function ProfileCard({ profile, onEdit, onDelete, onSetDefault }: ProfileCardProps) {
  function handleSetDefault() {
    if (!profile.isDefault) {
      onSetDefault(profile.id);
    }
  }

  return (
    <div
      className={cn(
        'border-border flex items-center justify-between rounded-lg border p-4 transition-colors',
        profile.isDefault && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          aria-label={profile.isDefault ? 'Default profile' : `Set ${profile.name} as default`}
          type="button"
          className={cn(
            'shrink-0 rounded p-1 transition-colors',
            profile.isDefault
              ? 'text-primary cursor-default'
              : 'text-muted-foreground hover:text-primary cursor-pointer',
          )}
          onClick={handleSetDefault}
        >
          <Star className={cn('h-4 w-4', profile.isDefault && 'fill-current')} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{profile.name}</span>
            {profile.isDefault ? (
              <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs">
                Default
              </span>
            ) : null}
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
            {profile.model ? (
              <span className="bg-muted rounded px-1.5 py-0.5">
                {MODEL_SHORT_LABELS[profile.model] ?? profile.model}
              </span>
            ) : null}
            {typeof profile.apiKey === 'string' && profile.apiKey.length > 0 ? (
              <span>API key configured</span>
            ) : (
              <span className="text-muted-foreground/60">No API key</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          aria-label={`Edit ${profile.name}`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1.5 transition-colors"
          type="button"
          onClick={() => onEdit(profile)}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          aria-label={`Delete ${profile.name}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1.5 transition-colors"
          type="button"
          onClick={() => onDelete(profile.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
