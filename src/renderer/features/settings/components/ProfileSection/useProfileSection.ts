/**
 * useProfileSection — logic hook for ProfileSection
 */

import { useState } from 'react';

import type { Profile } from '@shared/types';

import {
  useCreateProfile,
  useDeleteProfile,
  useProfiles,
  useSetDefaultProfile,
  useUpdateProfile,
} from '../../api/useSettings';

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export function useProfileSection() {
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
    const errorHandler = {
      onError: (error: unknown) => setErrorMessage(extractErrorMessage(error)),
    };
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

  return {
    profiles,
    isLoading,
    modalOpen,
    editingProfile,
    deleteConfirmId,
    errorMessage,
    setErrorMessage,
    handleAdd,
    handleEdit,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSetDefault,
    handleSave,
    handleCloseModal,
  };
}
