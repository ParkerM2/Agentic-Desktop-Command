/**
 * ToolsPage — Claude Config suite placeholder
 *
 * Shows upcoming tool categories: Skills, Commands, Agents, Plugins, Config.
 * Each card previews a future management surface.
 */

import {
  Bot,
  Puzzle,
  Settings2,
  Sparkles,
  Terminal,
} from 'lucide-react';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  PageContent,
  PageHeader,
  PageLayout,
  Text,
} from '@ui';

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
  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Manage Claude skills, commands, agents, and plugins">
            Tools
          </PageHeader.Title>
        </PageHeader.Row>
      </PageHeader>

      <PageContent>
        <div className="space-y-6">
          <div>
            <Heading as="h3" className="mb-1">
              Claude Config Suite
            </Heading>
            <Text variant="muted">
              These tools are coming soon. Each surface will let you manage a
              different aspect of your Claude workflow.
            </Text>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOL_CARDS.map((card) => (
              <Card key={card.name} className="opacity-70">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <card.icon className="text-muted-foreground h-5 w-5" />
                    <CardTitle>{card.name}</CardTitle>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
