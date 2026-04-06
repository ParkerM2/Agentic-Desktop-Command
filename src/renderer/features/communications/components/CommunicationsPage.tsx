/**
 * CommunicationsPage — Overview of connected communication services
 */

import { PageContent, PageHeader, PageLayout } from '@ui';

import { useCommunicationsEvents } from '../hooks/useCommunicationsEvents';
import { useCommunicationsStore } from '../store';

import { DiscordPanel } from './DiscordPanel';
import { NotificationRules } from './NotificationRules';
import { SlackPanel } from './SlackPanel';

type TabId = 'overview' | 'slack' | 'discord' | 'rules';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'slack', label: 'Slack' },
  { id: 'discord', label: 'Discord' },
  { id: 'rules', label: 'Rules' },
];

export function CommunicationsPage() {
  useCommunicationsEvents();

  const { activeTab, setActiveTab } = useCommunicationsStore();

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Manage your Slack and Discord integrations">
            Communications
          </PageHeader.Title>
        </PageHeader.Row>
        <PageHeader.Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabId)}
        >
          <PageHeader.TabList>
            {TABS.map((tab) => (
              <PageHeader.Tab key={tab.id} value={tab.id}>
                {tab.label}
              </PageHeader.Tab>
            ))}
          </PageHeader.TabList>

          <PageContent>
            <PageHeader.TabContent value="overview">
              <div className="space-y-4">
                <SlackPanel />
                <DiscordPanel />
              </div>
            </PageHeader.TabContent>
            <PageHeader.TabContent value="slack">
              <SlackPanel />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="discord">
              <DiscordPanel />
            </PageHeader.TabContent>
            <PageHeader.TabContent value="rules">
              <NotificationRules />
            </PageHeader.TabContent>
          </PageContent>
        </PageHeader.Tabs>
      </PageHeader>
    </PageLayout>
  );
}
