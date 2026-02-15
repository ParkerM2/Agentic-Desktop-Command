/**
 * Device UI Store — persists current device ID to localStorage
 */

import { create } from 'zustand';

const STORAGE_KEY = 'claude-ui-device';

function loadPersistedDeviceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface DeviceUIState {
  currentDeviceId: string | null;
  setCurrentDeviceId: (id: string | null) => void;
}

export const useDeviceStore = create<DeviceUIState>()((set) => ({
  currentDeviceId: loadPersistedDeviceId(),

  setCurrentDeviceId: (id) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ currentDeviceId: id });
  },
}));
