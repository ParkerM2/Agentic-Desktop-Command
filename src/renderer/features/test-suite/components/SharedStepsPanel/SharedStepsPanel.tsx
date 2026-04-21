import { Folder, Trash2 } from 'lucide-react';

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

import { CreateSharedStepDialog } from '../CreateSharedStepDialog';

import { useSharedStepsPanel } from './useSharedStepsPanel';

export function SharedStepsPanel() {
  const vm = useSharedStepsPanel();

  if (!vm.projectId) return null;

  return (
    <PageContent>
      <Flex align="center" className="border-b border-border px-4 py-3" gap="sm" wrap="nowrap">
        <Select value={vm.domainFilter} onValueChange={vm.setDomainFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter domain..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {vm.domains.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <CreateSharedStepDialog projectId={vm.projectId} />
      </Flex>

      <ScrollArea className="flex-1">
        {vm.filtered.length === 0 ? (
          <EmptyState
            description="Create reusable step sequences to speed up test recording."
            title="No shared steps"
          />
        ) : (
          <Grid className="p-4" cols={2} gap="md">
            {vm.filtered.map((group) => (
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
                      onClick={() => { vm.insertSteps(group); }}
                    >
                      Insert into Recording
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { vm.handleDelete(group.id); }}
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
