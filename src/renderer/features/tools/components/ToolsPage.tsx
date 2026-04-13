/**
 * ToolsPage — Tabbed layout for Claude Config and ADC Workflow
 *
 * Config tab: live Skills, Agents, and Commands from .claude/ directory.
 * Workflow tab: placeholder for the workflow editor.
 */

import { Cog, Workflow } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  PageContent,
  PageHeader,
  PageLayout,
  Skeleton,
  Text,
} from '@ui';

import { useClaudeConfig } from '../api/useClaudeConfig';
import { useToolsUI } from '../store';

import { WorkflowEditor } from './WorkflowEditor';

interface ConfigSectionProps {
  items: Array<{ name: string; description: string }>;
  loading: boolean;
  title: string;
  type: string;
}

function ConfigSection({ items, loading, title, type }: ConfigSectionProps) {
  function renderContent() {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      );
    }

    const hasItems = items.length > 0;

    if (hasItems) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.name}>
              <CardHeader>
                <CardTitle className="text-sm">{item.name}</CardTitle>
                <CardDescription className="text-xs">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      );
    }

    return <Text className="text-muted-foreground text-sm">No {type}s found.</Text>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Heading as="h3" className="text-foreground text-sm font-semibold">{title}</Heading>
        {loading ? null : <Badge variant="secondary">{items.length}</Badge>}
      </div>
      {renderContent()}
    </div>
  );
}

export function ToolsPage() {
  const { activeTab, setActiveTab } = useToolsUI();
  const { data, isLoading, refetch } = useClaudeConfig();

  return (
    <PageLayout>
      <PageHeader.Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title description="Workflow configuration and Claude tooling">
              Tools
            </PageHeader.Title>
          </PageHeader.Row>
          <PageHeader.TabList>
            <PageHeader.Tab value="config">
              <Cog className="h-4 w-4" />
              Claude Config
            </PageHeader.Tab>
            <PageHeader.Tab value="workflow">
              <Workflow className="h-4 w-4" />
              ADC Workflow
            </PageHeader.Tab>
          </PageHeader.TabList>
        </PageHeader>
        <PageContent>
          <PageHeader.TabContent value="config">
            <div className="mb-4 flex items-center justify-between">
              <Heading as="h2" className="text-foreground text-sm font-semibold">Claude Configuration</Heading>
              <Button size="sm" type="button" variant="outline" onClick={() => void refetch()}>
                Refresh
              </Button>
            </div>
            <div className="space-y-6">
              <ConfigSection
                items={data?.skills ?? []}
                loading={isLoading}
                title="Skills"
                type="skill"
              />
              <ConfigSection
                items={data?.agents ?? []}
                loading={isLoading}
                title="Agents"
                type="agent"
              />
              <ConfigSection
                items={data?.commands ?? []}
                loading={isLoading}
                title="Commands"
                type="command"
              />
            </div>
          </PageHeader.TabContent>
          <PageHeader.TabContent value="workflow">
            <WorkflowEditor />
          </PageHeader.TabContent>
        </PageContent>
      </PageHeader.Tabs>
    </PageLayout>
  );
}
