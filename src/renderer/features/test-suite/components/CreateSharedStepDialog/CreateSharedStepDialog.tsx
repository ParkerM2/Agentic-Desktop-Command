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

import { useCreateSharedStepDialog } from './useCreateSharedStepDialog';

export function CreateSharedStepDialog({ projectId }: { projectId: string }) {
  const vm = useCreateSharedStepDialog(projectId);

  return (
    <Dialog open={vm.open} onOpenChange={vm.setOpen}>
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
              value={vm.name}
              onChange={(e) => { vm.setName(e.target.value); }}
            />
          </Stack>
          <Stack gap="sm">
            <Label>Domain</Label>
            <Input
              placeholder="Auth"
              value={vm.domain}
              onChange={(e) => { vm.setDomain(e.target.value); }}
            />
          </Stack>
          <Stack gap="sm">
            <Label>Description (optional)</Label>
            <Input
              placeholder="Standard login with email/password"
              value={vm.description}
              onChange={(e) => { vm.setDescription(e.target.value); }}
            />
          </Stack>
          <Text size="sm" variant="muted">
            {vm.recordedStepsCount} steps from current recording will be saved.
          </Text>
          <Button
            className="w-full"
            disabled={!vm.canCreate}
            onClick={vm.handleCreate}
          >
            Save Shared Steps
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
