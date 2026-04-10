/**
 * IntegrationsPage — Unified integration services page
 *
 * Tabs: Slack, Discord, Rules, GitHub, Calendar.
 * Consolidates the former communications and github feature pages.
 */

import { PageContent, PageHeader, PageLayout } from '@ui';

import { useIntegrationsEvents } from '../hooks/useIntegrationsEvents';
import { useIntegrationsStore } from '../store';

import { CalendarPanel } from './CalendarPanel';
import { DiscordPanel } from './DiscordPanel';
import { GitHubPanel } from './GitHubPanel';
import { NotificationRules } from './NotificationRules';
import { SlackPanel } from './SlackPanel';

import type { IntegrationsTab } from '../store';

const TABS: Array<{ id: IntegrationsTab; label: string }> = [
  { id: 'slack', label: 'Slack' },
  { id: 'discord', label: 'Discord' },
  { id: 'rules', label: 'Rules' },
  { id: 'github', label: 'GitHub' },
  { id: 'calendar', label: 'Calendar' },
];

export function IntegrationsPage() {
  useIntegrationsEvents();

  const { activeTab, setActiveTab } = useIntegrationsStore();

  return (
    <div data-testid="integrations-page">
      <PageLayout>
        <PageHeader.Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as IntegrationsTab)}
        >
          <PageHeader>
            <PageHeader.Row>
              <PageHeader.Title description="Manage your connected services and integrations">
                Integrations
              </PageHeader.Title>
            </PageHeader.Row>
            <PageHeader.TabList>
              {TABS.map((tab) => (
                <PageHeader.Tab key={tab.id} value={tab.id}>
                  {tab.label}
                </PageHeader.Tab>
              ))}
            </PageHeader.TabList>
          </PageHeader>
          <PageContent>
            <PageHeader.TabContent value="slack">
              <SlackPanel />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="discord">
              <DiscordPanel />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="rules">
              <NotificationRules />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="github">
              <GitHubPanel />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="calendar">
              <CalendarPanel />
            </PageHeader.TabContent>
          </PageContent>
        </PageHeader.Tabs>
      </PageLayout>
    </div>
  );
}
