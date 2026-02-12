/**
 * ProfileSection — Profile list with add/edit/delete actions
 */

import { useState } from 'react';

import { Loader2, Plus } from 'lucide-react';

import type { Profile } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import {
  useProfiles,
  useCreateProfile,
  useUpdateProfile,
  useDeleteProfile,
  useSetDefaultProfile,
} from '../api/useSettings';

import { ProfileCard } from './ProfileCard';
import { ProfileFormModal } from './ProfileFormModal';

export function ProfileSection() {
  const { data: profiles, isLoading } = useProfiles();
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();
  const setDefaultProfile = useSetDefaultProfile();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  function handleAdd() {
    setEditingProfile(null);
    setModalOpen(true);
  }

  function handleEdit(profile: Profile) {
    setEditingProfile(profile);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    deleteProfile.mutate(id);
  }

  function handleSetDefault(id: string) {
    setDefaultProfile.mutate(id);
  }

  function handleSave(data: { name: string; apiKey?: string; model?: string }) {
    if (editingProfile === null) {
      createProfile.mutate(data);
    } else {
      updateProfile.mutate({ id: editingProfile.id, updates: data });
    }
    setModalOpen(false);
    setEditingProfile(null);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingProfile(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Profiles
        </h2>
        <button
          className={cn(
            'text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs',
            'hover:bg-accent transition-colors',
          )}
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Profile
        </button>
      </div>

      <div className="space-y-2">
        {profiles?.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onSetDefault={handleSetDefault}
          />
        ))}
        {profiles?.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No profiles configured. Add one to get started.
          </p>
        ) : null}
      </div>

      <ProfileFormModal
        open={modalOpen}
        profile={editingProfile}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </section>
  );
}
