/**
 * PlanningPage — Consolidated planning tools with tabbed navigation
 *
 * Combines Roadmap, Ideation, and Insights
 * into a single tabbed view. All tools are project-scoped.
 */

import { BarChart3, Lightbulb, Map } from 'lucide-react';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { IdeationPage } from '@features/ideation';
import { InsightsPage } from '@features/insights';
import { RoadmapPage } from '@features/roadmap';

import { usePlanningStore } from '../store';

import type { PlanningTab } from '../store';

const TABS: Array<{ id: PlanningTab; label: string; icon: typeof Map }> = [
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'ideation', label: 'Ideation', icon: Lightbulb },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

export function PlanningPage() {
  const { activeTab, setActiveTab } = usePlanningStore();

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Roadmap, ideas, and project analytics">
            Planning
          </PageHeader.Title>
        </PageHeader.Row>
        <PageHeader.Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as PlanningTab)}
        >
          <PageHeader.TabList>
            {TABS.map((tab) => (
              <PageHeader.Tab key={tab.id} value={tab.id}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </PageHeader.Tab>
            ))}
          </PageHeader.TabList>

          <PageContent className="p-0">
            <PageHeader.TabContent value="roadmap">
              <RoadmapPage />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="ideation">
              <IdeationPage />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="insights">
              <InsightsPage />
            </PageHeader.TabContent>
          </PageContent>
        </PageHeader.Tabs>
      </PageHeader>
    </PageLayout>
  );
}
