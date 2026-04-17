import { useState } from 'react';

import type { RecordedStep } from '../test-suite-store';

import { useSaveScript } from '../api/useSaveScript';
import { describeStep } from '../lib/describe-step';
import { generateSpecPreview } from '../lib/generate-spec-preview';
import { useTestSuiteStore } from '../test-suite-store';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@ui';

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
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Save Recording</DialogTitle>
          <DialogDescription>Review and save your recorded test steps.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
            <TabsTrigger value="spec" className="flex-1">Spec File</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
            <TabsTrigger value="steps" className="flex-1">Steps</TabsTrigger>
          </TabsList>

          {/* Tab 1: Info */}
          <TabsContent value="info" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Text className="text-sm font-medium">Test Name *</Text>
              <Input
                placeholder="e.g. Login flow"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Text className="text-sm font-medium">Description</Text>
              <Textarea
                placeholder="Optional description..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Text className="text-sm font-medium">Test Directory</Text>
              <Input
                placeholder="tests"
                value={testDir}
                onChange={(e) => setTestDir(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* Tab 2: Spec File */}
          <TabsContent value="spec" className="pt-4">
            <pre className="max-h-80 overflow-auto rounded-md border border-border bg-bg-surface p-4 font-mono text-xs">
              {specPreview}
            </pre>
          </TabsContent>

          {/* Tab 3: Preview */}
          <TabsContent value="preview" className="pt-4">
            <div className="max-h-80 space-y-1 overflow-auto">
              {steps.map((s, i) => (
                <div key={s.stepIndex} className="flex items-baseline gap-2 text-sm">
                  <span className="w-6 shrink-0 text-right text-text-dim">{i + 1}.</span>
                  <span>{describeStep(s.step)}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab 4: Steps (raw data) */}
          <TabsContent value="steps" className="pt-4">
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="p-2">#</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Selector</th>
                    <th className="p-2">Value</th>
                    <th className="p-2">Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s, i) => (
                    <tr key={s.stepIndex} className="border-b border-border/50">
                      <td className="p-2 text-text-dim">{i + 1}</td>
                      <td className="p-2 font-mono uppercase text-accent">{s.step.type}</td>
                      <td className="max-w-[200px] truncate p-2">
                        {'selector' in s.step ? s.step.selector : '—'}
                      </td>
                      <td className="max-w-[150px] truncate p-2">
                        {'value' in s.step ? s.step.value : '—'}
                      </td>
                      <td className="p-2">
                        {'context' in s.step && s.step.context ? s.step.context.tagName : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
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
