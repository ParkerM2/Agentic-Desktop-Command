import { useState } from 'react';

import {
  Button,
  Checkbox,
  Code,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Flex,
  Input,
  Label,
  ScrollArea,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@ui';

import { useSaveScript } from '../api/useSaveScript';
import { generateAssertionSuggestions, type AssertionSuggestion } from '../lib/assertion-suggestions';
import { describeStep } from '../lib/describe-step';
import { generateSpecPreview } from '../lib/generate-spec-preview';
import { useTestSuiteStore } from '../test-suite-store';

import type { RecordedStep } from '../test-suite-store';

interface SaveRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  steps: RecordedStep[];
  projectId: string;
  testDirectory?: string;
}

export function SaveRecordingDialog({
  open,
  onOpenChange,
  defaultName,
  steps,
  projectId,
  testDirectory,
}: SaveRecordingDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [testDir, setTestDir] = useState(testDirectory ?? 'tests');
  const [suggestions, setSuggestions] = useState<AssertionSuggestion[]>(() =>
    generateAssertionSuggestions(steps),
  );
  const saveScript = useSaveScript(projectId);
  const clearSteps = useTestSuiteStore((s) => s.clearSteps);
  const saving = saveScript.isPending;

  const specPreview = generateSpecPreview({
    name: name || 'Untitled',
    steps: steps.map((s) => s.step),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const assertSteps = suggestions
      .filter((s) => s.accepted)
      .map((s) => ({
        type: 'assert' as const,
        selector: s.selector || 'body',
        expected: s.expected,
      }));

    const allSteps = [...steps.map((s) => s.step), ...assertSteps];

    saveScript.mutate(
      {
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        steps: allSteps,
        tags,
      },
      {
        onSuccess: () => {
          clearSteps();
          onOpenChange(false);
        },
        onError: (err) => {
          console.error('[SaveRecordingDialog] save failed:', err);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Save Recording</DialogTitle>
          <DialogDescription>Review and save your recorded test steps.</DialogDescription>
        </DialogHeader>

        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="info">
          <TabsList className="w-full shrink-0">
            <TabsTrigger className="flex-1" value="info">Info</TabsTrigger>
            <TabsTrigger className="flex-1" value="spec">Spec File</TabsTrigger>
            <TabsTrigger className="flex-1" value="preview">Preview</TabsTrigger>
            <TabsTrigger className="flex-1" value="steps">Steps</TabsTrigger>
          </TabsList>

          {/* Tab 1: Info */}
          <TabsContent className="flex-1 overflow-auto pt-4" value="info">
            <Stack gap="md">
              <Stack gap="sm">
                <Label>Test Name *</Label>
                <Input
                  placeholder="e.g. Login flow"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Stack>
              <Stack gap="sm">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Stack>
              <Stack gap="sm">
                <Label>Tags</Label>
                <Input
                  placeholder="smoke, regression, login (comma-separated)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </Stack>
              {suggestions.length > 0 && (
                <Stack gap="sm">
                  <Label>Suggested Assertions</Label>
                  <Text size="sm" variant="muted">
                    Check the assertions you want to include in the test.
                  </Text>
                  <Stack gap="sm">
                    {suggestions.map((s, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <Label key={`${s.selector}-${s.expected}-${i}`} className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={s.accepted}
                          className="mt-0.5"
                          onCheckedChange={(checked) => {
                            const next = [...suggestions];
                            next[i] = { ...next[i], accepted: checked === true };
                            setSuggestions(next);
                          }}
                        />
                        <Text variant="muted">{s.description}</Text>
                      </Label>
                    ))}
                  </Stack>
                </Stack>
              )}
              <Stack gap="sm">
                <Label>Test Directory</Label>
                <Input
                  placeholder="tests"
                  value={testDir}
                  onChange={(e) => setTestDir(e.target.value)}
                />
              </Stack>
            </Stack>
          </TabsContent>

          {/* Tab 2: Spec File */}
          <TabsContent className="min-h-0 flex-1 pt-4" value="spec">
            <ScrollArea className="h-full">
              <Code className="block whitespace-pre-wrap break-words rounded-md border border-border bg-bg-surface p-4">
                {specPreview}
              </Code>
            </ScrollArea>
          </TabsContent>

          {/* Tab 3: Preview */}
          <TabsContent className="min-h-0 flex-1 overflow-auto pt-4" value="preview">
            <Stack gap="sm">
              {steps.map((s, i) => (
                <Flex key={s.stepIndex} align="baseline" gap="sm">
                  <Text className="w-6 shrink-0 text-right text-text-dim">{i + 1}.</Text>
                  <Text>{describeStep(s.step)}</Text>
                </Flex>
              ))}
            </Stack>
          </TabsContent>

          {/* Tab 4: Steps (raw data) */}
          <TabsContent className="min-h-0 flex-1 overflow-auto pt-4" value="steps">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead>Selector</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-16">Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.map((s, i) => (
                  <TableRow key={s.stepIndex}>
                    <TableCell className="text-text-dim">{i + 1}</TableCell>
                    <TableCell className="font-mono uppercase text-accent">{s.step.type}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {'selector' in s.step ? s.step.selector : '—'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {'value' in s.step ? s.step.value : '—'}
                    </TableCell>
                    <TableCell>
                      {'context' in s.step && s.step.context ? s.step.context.tagName : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
