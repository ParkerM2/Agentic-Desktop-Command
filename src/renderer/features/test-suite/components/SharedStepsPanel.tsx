import { useState } from 'react';

import { Folder, Trash2 } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Flex,
  Grid,
  PageContent,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@ui';

import {
  useDeleteSharedSteps,
  useSharedStepDomains,
  useSharedSteps,
} from '../api/useSharedSteps';
import { useTestSuiteStore } from '../test-suite-store';

import { CreateSharedStepDialog } from './CreateSharedStepDialog';

export function SharedStepsPanel() {
  const { projectId } = useLooseParams();
  const { data: groups = [] } = useSharedSteps(projectId);
  const { data: domains = [] } = useSharedStepDomains(projectId);
  const deleteSharedSteps = useDeleteSharedSteps();
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const addStep = useTestSuiteStore((s) => s.addStep);

  if (!projectId) return null;

  const filtered = domainFilter === 'all'
    ? groups
    : groups.filter((g) => g.domain === domainFilter);

  const insertSteps = (group: typeof groups[0]) => {
    for (let i = 0; i < group.steps.length; i++) {
      addStep({
        stepIndex: Date.now() + i,
        step: group.steps[i],
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <PageContent>
      <Flex align="center" className="border-b border-border px-4 py-3" gap="sm" wrap="nowrap">
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter domain..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {domains.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <CreateSharedStepDialog projectId={projectId} />
      </Flex>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <EmptyState
            description="Create reusable step sequences to speed up test recording."
            title="No shared steps"
          />
        ) : (
          <Grid className="p-4" cols={2} gap="md">
            {filtered.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <Flex align="center" gap="sm">
                      <Folder className="h-4 w-4 text-text-muted" />
                      {group.name}
                    </Flex>
                    <Badge variant="secondary">{group.domain}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {group.description ? (
                    <Text className="mb-2" size="sm" variant="muted">{group.description}</Text>
                  ) : null}
                  <Text className="mb-2" size="sm" variant="muted">
                    {group.steps.length} steps — used {group.usageCount}x
                  </Text>
                  <Flex gap="sm">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { insertSteps(group); }}
                    >
                      Insert into Recording
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { deleteSharedSteps.mutate(group.id); }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </Flex>
                </CardContent>
              </Card>
            ))}
          </Grid>
        )}
      </ScrollArea>
    </PageContent>
  );
}
