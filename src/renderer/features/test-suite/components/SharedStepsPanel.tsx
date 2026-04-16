import { useState } from 'react';

import { Folder, Plus, Trash2 } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  PageContent,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import {
  useCreateSharedSteps,
  useDeleteSharedSteps,
  useSharedStepDomains,
  useSharedSteps,
} from '../api/useSharedSteps';
import { useTestSuiteStore } from '../test-suite-store';

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
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
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
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <EmptyState
            description="Create reusable step sequences to speed up test recording."
            title="No shared steps"
          />
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {filtered.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-text-muted" />
                      {group.name}
                    </span>
                    <Badge variant="secondary">{group.domain}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {group.description ? (
                    <p className="mb-2 text-xs text-text-muted">{group.description}</p>
                  ) : null}
                  <p className="mb-2 text-xs text-text-muted">
                    {group.steps.length} steps — used {group.usageCount}x
                  </p>
                  <div className="flex gap-1">
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </PageContent>
  );
}

function CreateSharedStepDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const createSharedSteps = useCreateSharedSteps();
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);

  const handleCreate = () => {
    if (!name.trim() || !domain.trim() || recordedSteps.length === 0) return;
    createSharedSteps.mutate(
      {
        projectId,
        name: name.trim(),
        domain: domain.trim(),
        description: description.trim() || undefined,
        steps: recordedSteps.map((r) => r.step),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setDomain('');
          setDescription('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Save Current Steps
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save as Shared Steps</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              placeholder="Login flow"
              value={name}
              onChange={(e) => { setName(e.target.value); }}
            />
          </div>
          <div>
            <Label>Domain</Label>
            <Input
              placeholder="Auth"
              value={domain}
              onChange={(e) => { setDomain(e.target.value); }}
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              placeholder="Standard login with email/password"
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
            />
          </div>
          <p className="text-xs text-text-muted">
            {recordedSteps.length} steps from current recording will be saved.
          </p>
          <Button
            className="w-full"
            disabled={!name.trim() || !domain.trim() || recordedSteps.length === 0}
            onClick={handleCreate}
          >
            Save Shared Steps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
