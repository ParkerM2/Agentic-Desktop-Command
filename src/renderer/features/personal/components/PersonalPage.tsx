/**
 * PersonalPage — Tabbed layout for personal features
 */

import { lazy, Suspense } from 'react';

import { Bell, CalendarDays, Dumbbell, Newspaper, ScrollText, StickyNote } from 'lucide-react';

import { PageContent, PageHeader, PageLayout, Spinner } from '@ui';

import { usePersonalStore } from '../store';

// ── Lazy Tab Content ─────────────────────────────────────────

const NotesPage = lazy(() =>
  import('../notes/components/NotesPage').then((m) => ({ default: m.NotesPage })),
);
const FitnessPage = lazy(() =>
  import('../fitness/components/FitnessPage').then((m) => ({ default: m.FitnessPage })),
);
const PlannerPage = lazy(() =>
  import('../planner/components/PlannerPage').then((m) => ({ default: m.PlannerPage })),
);
const BriefingPage = lazy(() =>
  import('../briefing/components/BriefingPage').then((m) => ({ default: m.BriefingPage })),
);
const AlertsPage = lazy(() =>
  import('../alerts/components/AlertsPage').then((m) => ({ default: m.AlertsPage })),
);
const ChangelogPage = lazy(() =>
  import('../changelog/components/ChangelogPage').then((m) => ({ default: m.ChangelogPage })),
);

// ── Constants ────────────────────────────────────────────────

const TABS = [
  { id: 'notes' as const, label: 'Notes', icon: StickyNote },
  { id: 'fitness' as const, label: 'Fitness', icon: Dumbbell },
  { id: 'planner' as const, label: 'Planner', icon: CalendarDays },
  { id: 'briefing' as const, label: 'Briefing', icon: Newspaper },
  { id: 'alerts' as const, label: 'Alerts', icon: Bell },
  { id: 'changelog' as const, label: 'Changelog', icon: ScrollText },
];

// ── Component ────────────────────────────────────────────────

function TabFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner aria-label="Loading" size="lg" />
    </div>
  );
}

export function PersonalPage() {
  const { activeTab, setActiveTab } = usePersonalStore();

  return (
    <PageLayout data-testid="personal-page">
      <PageHeader.Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title description="Notes, fitness, planning, briefing, and more">
              Personal
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
          <PageHeader.TabContent value="notes">
            <Suspense fallback={<TabFallback />}>
              <NotesPage />
            </Suspense>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="fitness">
            <Suspense fallback={<TabFallback />}>
              <FitnessPage />
            </Suspense>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="planner">
            <Suspense fallback={<TabFallback />}>
              <PlannerPage />
            </Suspense>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="briefing">
            <Suspense fallback={<TabFallback />}>
              <BriefingPage />
            </Suspense>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="alerts">
            <Suspense fallback={<TabFallback />}>
              <AlertsPage />
            </Suspense>
          </PageHeader.TabContent>

          <PageHeader.TabContent value="changelog">
            <Suspense fallback={<TabFallback />}>
              <ChangelogPage />
            </Suspense>
          </PageHeader.TabContent>
        </PageContent>
      </PageHeader.Tabs>
    </PageLayout>
  );
}
