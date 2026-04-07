/**
 * ToolsPage — Tabbed layout for Claude Config and ADC Workflow
 *
 * Config tab: upcoming tool categories (Skills, Commands, Agents, Plugins, Config).
 * Workflow tab: placeholder for the workflow editor.
 */

import { Bot, Cog, Puzzle, Settings2, Sparkles, Terminal, Workflow } from 'lucide-react';

import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  PageContent,
  PageHeader,
  PageLayout,
} from '@ui';

import { useToolsUI } from '../store';

import { WorkflowEditor } from './WorkflowEditor';

import type { LucideIcon } from 'lucide-react';

interface ToolCard {
  icon: LucideIcon;
  name: string;
  description: string;
}

const TOOL_CARDS: ToolCard[] = [
  {
    icon: Sparkles,
    name: 'Skills',
    description: 'Manage reusable skill definitions for Claude sessions',
  },
  {
    icon: Terminal,
    name: 'Commands',
    description: 'Custom slash commands and automation shortcuts',
  },
  {
    icon: Bot,
    name: 'Agents',
    description: 'Configure agent roles, tools, and spawn templates',
  },
  {
    icon: Puzzle,
    name: 'Plugins',
    description: 'Install and manage Claude Code plugins',
  },
  {
    icon: Settings2,
    name: 'Config',
    description: 'Global and project-level Claude configuration',
  },
];

export function ToolsPage() {
  const { activeTab, setActiveTab } = useToolsUI();

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Workflow configuration and Claude tooling">
            Tools
          </PageHeader.Title>
        </PageHeader.Row>
        <PageHeader.Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
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

          <PageContent>
            <PageHeader.TabContent value="config">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TOOL_CARDS.map((card) => (
                  <Card key={card.name} className="opacity-70">
                    <CardHeader>
                      <div className="mb-2 flex items-center gap-2">
                        <card.icon className="text-muted-foreground h-5 w-5" />
                        <CardTitle>{card.name}</CardTitle>
                        <Badge className="ml-auto text-xs" variant="outline">
                          Coming soon
                        </Badge>
                      </div>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </PageHeader.TabContent>
            <PageHeader.TabContent value="workflow">
              <WorkflowEditor />
            </PageHeader.TabContent>
          </PageContent>
        </PageHeader.Tabs>
      </PageHeader>
    </PageLayout>
  );
}
