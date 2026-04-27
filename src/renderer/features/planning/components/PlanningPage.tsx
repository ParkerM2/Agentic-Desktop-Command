/**
 * PlanningPage — Consolidated planning tools with tabbed navigation
 *
 * Combines Ideation and Insights
 * into a single tabbed view. All tools are project-scoped.
 */

import { BarChart3, Lightbulb } from 'lucide-react';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { IdeationPage } from '@features/ideas';
import { InsightsPage } from '@features/insights';

import { usePlanningStore } from '../store';

import type { PlanningTab } from '../store';

const TABS: Array<{ id: PlanningTab; label: string; icon: typeof BarChart3 }> = [
  { id: 'ideation', label: 'Ideation', icon: Lightbulb },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

export function PlanningPage() {
  const { activeTab, setActiveTab } = usePlanningStore();

  return (
    <PageLayout>
      <PageHeader.Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PlanningTab)}
      >
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title description="Ideas and project analytics">
              Planning
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
        <PageContent className="p-0">
          <PageHeader.TabContent value="ideation">
            <IdeationPage />
          </PageHeader.TabContent>
          <PageHeader.TabContent value="insights">
            <InsightsPage />
          </PageHeader.TabContent>
        </PageContent>
      </PageHeader.Tabs>
    </PageLayout>
  );
}
