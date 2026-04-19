import { useState } from 'react';

import { Plus } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Stack,
  Text,
} from '@ui';

import { useCreateSharedSteps } from '../api/useSharedSteps';
import { useTestSuiteStore } from '../test-suite-store';

export function CreateSharedStepDialog({ projectId }: { projectId: string }) {
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
        <Stack gap="md">
          <Stack gap="sm">
            <Label>Name</Label>
            <Input
              placeholder="Login flow"
              value={name}
              onChange={(e) => { setName(e.target.value); }}
            />
          </Stack>
          <Stack gap="sm">
            <Label>Domain</Label>
            <Input
              placeholder="Auth"
              value={domain}
              onChange={(e) => { setDomain(e.target.value); }}
            />
          </Stack>
          <Stack gap="sm">
            <Label>Description (optional)</Label>
            <Input
              placeholder="Standard login with email/password"
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
            />
          </Stack>
          <Text size="sm" variant="muted">
            {recordedSteps.length} steps from current recording will be saved.
          </Text>
          <Button
            className="w-full"
            disabled={!name.trim() || !domain.trim() || recordedSteps.length === 0}
            onClick={handleCreate}
          >
            Save Shared Steps
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
