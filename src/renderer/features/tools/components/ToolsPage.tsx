/**
 * ToolsPage — Consolidated project tools with tabbed navigation
 *
 * Combines Roadmap, Ideation, Insights, Changelog, and GitHub
 * into a single tabbed view. All tools are project-scoped.
 */

import {
  BarChart3,
  GitBranch,
  Lightbulb,
  Map,
  ScrollText,
} from 'lucide-react';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { ChangelogPage } from '@features/changelog';
import { GitHubPage } from '@features/github';
import { IdeationPage } from '@features/ideation';
import { InsightsPage } from '@features/insights';
import { RoadmapPage } from '@features/roadmap';

import { useToolsStore } from '../store';

import type { ToolsTab } from '../store';

const TABS: Array<{ id: ToolsTab; label: string; icon: typeof Map }> = [
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'ideation', label: 'Ideation', icon: Lightbulb },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'changelog', label: 'Changelog', icon: ScrollText },
  { id: 'github', label: 'GitHub', icon: GitBranch },
];

export function ToolsPage() {
  const { activeTab, setActiveTab } = useToolsStore();

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Project development tools">
            Tools
          </PageHeader.Title>
        </PageHeader.Row>
        <PageHeader.Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ToolsTab)}
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
            <PageHeader.TabContent value="changelog">
              <ChangelogPage />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="github">
              <GitHubPage />
            </PageHeader.TabContent>
          </PageContent>
        </PageHeader.Tabs>
      </PageHeader>
    </PageLayout>
  );
}
