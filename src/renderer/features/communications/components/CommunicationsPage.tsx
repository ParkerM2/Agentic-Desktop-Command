/**
 * CommunicationsPage — Overview of connected communication services
 */

import { PageContent, PageHeader, PageLayout, Tabs, TabsContent, TabsList, TabsTrigger } from '@ui';

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
      <PageHeader
        description="Manage your Slack and Discord integrations"
        title="Communications"
      />

      <PageContent>
        <div className="mx-auto max-w-4xl">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabId)}
          >
            <TabsList className="mb-6">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-4">
                <SlackPanel />
                <DiscordPanel />
              </div>
            </TabsContent>

            <TabsContent value="slack">
              <SlackPanel />
            </TabsContent>

            <TabsContent value="discord">
              <DiscordPanel />
            </TabsContent>

            <TabsContent value="rules">
              <NotificationRules />
            </TabsContent>
          </Tabs>
        </div>
      </PageContent>
    </PageLayout>
  );
}
