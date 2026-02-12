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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleAdd() {
    setEditingProfile(null);
    setModalOpen(true);
  }

  function handleEdit(profile: Profile) {
    setEditingProfile(profile);
    setModalOpen(true);
  }

  function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  function handleDeleteRequest(id: string) {
    setErrorMessage(null);
    setDeleteConfirmId(id);
  }

  function handleDeleteConfirm() {
    if (deleteConfirmId !== null) {
      deleteProfile.mutate(deleteConfirmId, {
        onError: (error) => setErrorMessage(extractErrorMessage(error)),
      });
      setDeleteConfirmId(null);
    }
  }

  function handleDeleteCancel() {
    setDeleteConfirmId(null);
  }

  function handleSetDefault(id: string) {
    setDefaultProfile.mutate(id);
  }

  function handleSave(data: { name: string; apiKey?: string; model?: string }) {
    setErrorMessage(null);
    const errorHandler = { onError: (error: unknown) => setErrorMessage(extractErrorMessage(error)) };
    if (editingProfile === null) {
      createProfile.mutate(data, errorHandler);
    } else {
      updateProfile.mutate({ id: editingProfile.id, updates: data }, errorHandler);
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

  const deleteTarget = deleteConfirmId === null
    ? undefined
    : profiles?.find((p) => p.id === deleteConfirmId);

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Profiles
        </h2>
        <button
          type="button"
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
            onDelete={handleDeleteRequest}
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

      {/* Error message */}
      {errorMessage === null ? null : (
        <div className="border-destructive/50 bg-destructive/5 mt-3 flex items-center justify-between rounded-lg border p-3">
          <p className="text-destructive text-sm">{errorMessage}</p>
          <button
            className="text-muted-foreground hover:text-foreground rounded px-2 py-1 text-xs"
            type="button"
            onClick={() => setErrorMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget ? (
        <div className="border-destructive/50 bg-destructive/5 mt-3 flex items-center justify-between rounded-lg border p-3">
          <p className="text-sm">
            Delete profile <strong>{deleteTarget.name}</strong>?
          </p>
          <div className="flex gap-2">
            <button
              className="text-muted-foreground hover:text-foreground rounded px-3 py-1 text-sm"
              type="button"
              onClick={handleDeleteCancel}
            >
              Cancel
            </button>
            <button
              className="bg-destructive text-destructive-foreground rounded px-3 py-1 text-sm font-medium"
              type="button"
              onClick={handleDeleteConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <ProfileFormModal
        open={modalOpen}
        profile={editingProfile}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </section>
  );
}
