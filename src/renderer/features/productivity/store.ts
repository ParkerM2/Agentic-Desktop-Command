/**
 * Productivity feature UI state store
 */

import { create } from 'zustand';

interface ProductivityState {
  /** Active tab in the productivity page */
  activeTab: 'overview' | 'calendar' | 'spotify' | 'briefing' | 'notes' | 'planner' | 'alerts' | 'comms';
  /** Search query for Spotify */
  spotifySearchQuery: string;
  setActiveTab: (tab: ProductivityState['activeTab']) => void;
  setSpotifySearchQuery: (query: string) => void;
}

export const useProductivityStore = create<ProductivityState>((set) => ({
  activeTab: 'overview',
  spotifySearchQuery: '',
  setActiveTab: (activeTab) => {
    set({ activeTab });
  },
  setSpotifySearchQuery: (spotifySearchQuery) => {
    set({ spotifySearchQuery });
  },
}));
