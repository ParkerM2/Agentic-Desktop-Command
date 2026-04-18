import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
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
  Textarea,
} from '@ui';

import { useSaveScript } from '../api/useSaveScript';
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
  const [testDir, setTestDir] = useState(testDirectory ?? 'tests');
  const saveScript = useSaveScript(projectId);
  const clearSteps = useTestSuiteStore((s) => s.clearSteps);
  const saving = saveScript.isPending;

  const specPreview = generateSpecPreview({
    name: name || 'Untitled',
    steps: steps.map((s) => s.step),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    saveScript.mutate(
      {
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        steps: steps.map((s) => s.step),
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Test Name *</Label>
                <Input
                  placeholder="e.g. Login flow"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Test Directory</Label>
                <Input
                  placeholder="tests"
                  value={testDir}
                  onChange={(e) => setTestDir(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Spec File */}
          <TabsContent className="min-h-0 flex-1 pt-4" value="spec">
            <ScrollArea className="h-full">
              <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-bg-surface p-4 font-mono text-xs">
                {specPreview}
              </pre>
            </ScrollArea>
          </TabsContent>

          {/* Tab 3: Preview */}
          <TabsContent className="min-h-0 flex-1 overflow-auto pt-4" value="preview">
            <div className="space-y-1">
              {steps.map((s, i) => (
                <div key={s.stepIndex} className="flex items-baseline gap-2 text-sm">
                  <span className="w-6 shrink-0 text-right text-text-dim">{i + 1}.</span>
                  <span>{describeStep(s.step)}</span>
                </div>
              ))}
            </div>
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
