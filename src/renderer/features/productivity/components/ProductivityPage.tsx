/**
 * ProductivityPage — Dashboard combining Calendar and Spotify widgets
 */

import { Bell, Calendar, CalendarDays, Globe, Headphones, LayoutGrid, Newspaper, StickyNote } from 'lucide-react';

import {
  PageContent,
  PageHeader,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ui';

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

// ── Component ────────────────────────────────────────────────

export function ProductivityPage() {
  const { activeTab, setActiveTab } = useProductivityStore();

  return (
    <PageLayout>
      <PageHeader
        description="Calendar, music, and productivity tools in one place"
        title="Productivity"
      />
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList className="border-border w-full justify-start rounded-none border-b px-6 py-0">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} className="gap-1.5" value={tab.id}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <PageContent>
          <TabsContent className="mt-0" value="overview">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CalendarWidget />
              <SpotifyWidget />
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="calendar">
            <div className="mx-auto max-w-2xl">
              <CalendarWidget />
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="spotify">
            <div className="mx-auto max-w-md">
              <SpotifyWidget />
            </div>
          </TabsContent>

          <TabsContent className="mt-0 h-full" value="briefing">
            <BriefingPage />
          </TabsContent>

          <TabsContent className="mt-0 h-full" value="notes">
            <NotesPage />
          </TabsContent>

          <TabsContent className="mt-0 h-full" value="planner">
            <PlannerPage />
          </TabsContent>

          <TabsContent className="mt-0 h-full" value="alerts">
            <AlertsPage />
          </TabsContent>

          <TabsContent className="mt-0 h-full" value="comms">
            <CommunicationsPage />
          </TabsContent>
        </PageContent>
      </Tabs>
    </PageLayout>
  );
}
