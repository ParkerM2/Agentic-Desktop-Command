/**
 * ProductivityPage — Dashboard combining Calendar and Spotify widgets
 */

import { Bell, Calendar, CalendarDays, Globe, Headphones, LayoutGrid, Newspaper, StickyNote } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { AlertsPage } from '@features/alerts';
import { BriefingPage } from '@features/briefing';
import { CommunicationsPage } from '@features/communications';
import { NotesPage } from '@features/notes';
import { PlannerPage } from '@features/planner';

import { useProductivityStore } from '../store';

import { CalendarWidget } from './CalendarWidget';
import { SpotifyWidget } from './SpotifyWidget';

// ── Constants ────────────────────────────────────────────────

const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutGrid },
  { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
  { id: 'spotify' as const, label: 'Spotify', icon: Headphones },
  { id: 'briefing' as const, label: 'Briefing', icon: Newspaper },
  { id: 'notes' as const, label: 'Notes', icon: StickyNote },
  { id: 'planner' as const, label: 'Planner', icon: CalendarDays },
  { id: 'alerts' as const, label: 'Alerts', icon: Bell },
  { id: 'comms' as const, label: 'Comms', icon: Globe },
];

const TAB_BASE = 'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors';
const TAB_ACTIVE = 'border-primary text-foreground font-medium';
const TAB_INACTIVE = 'border-transparent text-muted-foreground hover:text-foreground';

// ── Component ────────────────────────────────────────────────

export function ProductivityPage() {
  const { activeTab, setActiveTab } = useProductivityStore();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-border border-b px-6 py-4">
        <h1 className="text-foreground text-2xl font-bold">Productivity</h1>
        <p className="text-muted-foreground text-sm">
          Calendar, music, and productivity tools in one place
        </p>
      </div>

      {/* Tabs */}
      <div className="border-border border-b px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={cn(TAB_BASE, activeTab === tab.id ? TAB_ACTIVE : TAB_INACTIVE)}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
              }}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CalendarWidget />
            <SpotifyWidget />
          </div>
        ) : null}

        {activeTab === 'calendar' ? (
          <div className="mx-auto max-w-2xl">
            <CalendarWidget />
          </div>
        ) : null}

        {activeTab === 'spotify' ? (
          <div className="mx-auto max-w-md">
            <SpotifyWidget />
          </div>
        ) : null}

        {activeTab === 'briefing' ? (
          <div className="h-full">
            <BriefingPage />
          </div>
        ) : null}

        {activeTab === 'notes' ? (
          <div className="h-full">
            <NotesPage />
          </div>
        ) : null}

        {activeTab === 'planner' ? (
          <div className="h-full">
            <PlannerPage />
          </div>
        ) : null}

        {activeTab === 'alerts' ? (
          <div className="h-full">
            <AlertsPage />
          </div>
        ) : null}

        {activeTab === 'comms' ? (
          <div className="h-full">
            <CommunicationsPage />
          </div>
        ) : null}
      </div>
    </div>
  );
}
