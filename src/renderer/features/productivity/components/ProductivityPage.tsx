/**
 * ProductivityPage — Dashboard combining Calendar and Spotify widgets
 */

import { Bell, Calendar, CalendarDays, Globe, Headphones, LayoutGrid, Newspaper, StickyNote } from 'lucide-react';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { IntegrationsPage } from '@features/integrations';
import { AlertsPage } from '@features/alerts';
import { BriefingPage } from '@features/briefing';
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

// ── Component ────────────────────────────────────────────────

export function ProductivityPage() {
  const { activeTab, setActiveTab } = useProductivityStore();

  return (
    <PageLayout>
      <PageHeader.Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title description="Calendar, music, and productivity tools in one place">
              Productivity
            </PageHeader.Title>
          </PageHeader.Row>
          <PageHeader.TabList>
            {TABS.map((tab) => (
              <PageHeader.Tab key={tab.id} value={tab.id}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </PageHeader.Tab>
            ))}
          </PageHeader.TabList>
        </PageHeader>
        <PageContent>
          <PageHeader.TabContent value="overview">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CalendarWidget />
              <SpotifyWidget />
            </div>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="calendar">
            <CalendarWidget />
          </PageHeader.TabContent>

          <PageHeader.TabContent value="spotify">
            <SpotifyWidget />
          </PageHeader.TabContent>

          <PageHeader.TabContent value="briefing">
            <BriefingPage />
          </PageHeader.TabContent>

          <PageHeader.TabContent value="notes">
            <NotesPage />
          </PageHeader.TabContent>

          <PageHeader.TabContent value="planner">
            <PlannerPage />
          </PageHeader.TabContent>

          <PageHeader.TabContent value="alerts">
            <AlertsPage />
          </PageHeader.TabContent>

          <PageHeader.TabContent value="comms">
            <IntegrationsPage />
          </PageHeader.TabContent>
        </PageContent>
      </PageHeader.Tabs>
    </PageLayout>
  );
}
