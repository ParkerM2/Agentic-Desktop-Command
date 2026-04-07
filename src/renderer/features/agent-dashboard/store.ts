/**
 * Agent Dashboard Store — UI-only state (layout, panels, selection, filters, tabs).
 * Server state (sessions, messages) lives in React Query.
 */

import { create } from 'zustand';

import type { AgentLayoutMode, AgentPanelState, AgentStatus } from '@shared/types/agent-dashboard';

type StatusFilter = AgentStatus | 'all';

interface AgentDashboardState {
  // Layout
  layoutMode: AgentLayoutMode;
  setLayoutMode: (mode: AgentLayoutMode) => void;

  // Panel states (sessionId -> display state)
  panelStates: Map<string, AgentPanelState>;
  setPanelState: (sessionId: string, state: AgentPanelState) => void;
  expandPanel: (sessionId: string) => void;
  collapsePanel: (sessionId: string) => void;
  openPopup: (sessionId: string) => void;
  closePopup: () => void;

  // Selection
  selectedSessionId: string | null;
  setSelectedSession: (sessionId: string | null) => void;
  popupSessionId: string | null;

  // Filters
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  projectFilter: string | null;
  setProjectFilter: (projectId: string | null) => void;

  // Active tab per panel (sessionId -> tab name)
  activeTabs: Map<string, string>;
  setActiveTab: (sessionId: string, tab: string) => void;

  // ── Workflow Templates UI state ─────────────────────────────

  /** Currently selected template ID in the template list */
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;

  /** Whether the template editor panel is open */
  isEditorOpen: boolean;
  openEditor: (templateId: string | null) => void;
  closeEditor: () => void;

  /** Template ID being edited (null = creating new) */
  editingTemplateId: string | null;

  /** Whether the launch dialog is open */
  isLaunchDialogOpen: boolean;
  openLaunchDialog: (templateId: string) => void;
  closeLaunchDialog: () => void;

  /** Template ID targeted for launch */
  launchTemplateId: string | null;

  /** Active main tab (agents | workflows) */
  activeMainTab: 'agents' | 'workflows';
  setActiveMainTab: (tab: 'agents' | 'workflows') => void;
}

export const useAgentDashboardStore = create<AgentDashboardState>((set) => ({
  layoutMode: 'single',
  setLayoutMode: (mode) => set({ layoutMode: mode }),

  panelStates: new Map(),
  setPanelState: (sessionId, state) =>
    set((s) => {
      const next = new Map(s.panelStates);
      next.set(sessionId, state);
      return { panelStates: next };
    }),
  expandPanel: (sessionId) =>
    set((s) => {
      const next = new Map(s.panelStates);
      next.set(sessionId, 'expanded');
      return { panelStates: next };
    }),
  collapsePanel: (sessionId) =>
    set((s) => {
      const next = new Map(s.panelStates);
      next.set(sessionId, 'compact');
      return { panelStates: next };
    }),
  openPopup: (sessionId) =>
    set((s) => {
      const next = new Map(s.panelStates);
      // Close any existing popup first
      if (s.popupSessionId !== null) {
        next.set(s.popupSessionId, 'compact');
      }
      next.set(sessionId, 'popup');
      return { panelStates: next, popupSessionId: sessionId };
    }),
  closePopup: () =>
    set((s) => {
      if (s.popupSessionId === null) return s;
      const next = new Map(s.panelStates);
      next.set(s.popupSessionId, 'compact');
      return { panelStates: next, popupSessionId: null };
    }),

  selectedSessionId: null,
  setSelectedSession: (sessionId) => set({ selectedSessionId: sessionId }),
  popupSessionId: null,

  statusFilter: 'all',
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  projectFilter: null,
  setProjectFilter: (projectId) => set({ projectFilter: projectId }),

  activeTabs: new Map(),
  setActiveTab: (sessionId, tab) =>
    set((s) => {
      const next = new Map(s.activeTabs);
      next.set(sessionId, tab);
      return { activeTabs: next };
    }),

  // ── Workflow Templates UI state ─────────────────────────────

  selectedTemplateId: null,
  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),

  isEditorOpen: false,
  editingTemplateId: null,
  openEditor: (templateId) => set({ isEditorOpen: true, editingTemplateId: templateId }),
  closeEditor: () => set({ isEditorOpen: false, editingTemplateId: null }),

  isLaunchDialogOpen: false,
  launchTemplateId: null,
  openLaunchDialog: (templateId) => set({ isLaunchDialogOpen: true, launchTemplateId: templateId }),
  closeLaunchDialog: () => set({ isLaunchDialogOpen: false, launchTemplateId: null }),

  activeMainTab: 'agents',
  setActiveMainTab: (tab) => set({ activeMainTab: tab }),
}));
