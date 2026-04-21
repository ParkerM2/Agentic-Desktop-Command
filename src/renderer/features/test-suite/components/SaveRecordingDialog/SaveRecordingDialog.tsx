import type { AssertMethod } from '@shared/types/test-suite';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

import { describeStep } from '../../lib/describe-step';

import { useSaveRecordingDialog } from './useSaveRecordingDialog';

import type { RecordedStep } from '../../test-suite-store';

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
  const vm = useSaveRecordingDialog({ open, onOpenChange, defaultName, steps, projectId, testDirectory });

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
                  value={vm.name}
                  onChange={(e) => vm.setName(e.target.value)}
                />
              </Stack>
              <Stack gap="sm">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  rows={3}
                  value={vm.description}
                  onChange={(e) => vm.setDescription(e.target.value)}
                />
              </Stack>
              <Stack gap="sm">
                <Label>Tags</Label>
                <Input
                  placeholder="smoke, regression, login (comma-separated)"
                  value={vm.tagsInput}
                  onChange={(e) => vm.setTagsInput(e.target.value)}
                />
              </Stack>
              <Stack gap="sm">
                <Flex align="center" justify="between">
                  <Label>Assertions</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => vm.setShowAddAssertion(!vm.showAddAssertion)}
                  >
                    {vm.showAddAssertion ? 'Cancel' : 'Add Assertion'}
                  </Button>
                </Flex>

                {vm.showAddAssertion ? (
                  <Stack className="rounded-md border border-border p-3" gap="sm">
                    <Flex gap="sm" wrap="wrap">
                      <Select value={vm.newMethod} onValueChange={(v) => vm.setNewMethod(v as AssertMethod)}>
                        <SelectTrigger className="h-7 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="toHaveText">Has Text</SelectItem>
                          <SelectItem value="toContainText">Contains Text</SelectItem>
                          <SelectItem value="toBeVisible">Is Visible</SelectItem>
                          <SelectItem value="toBeHidden">Is Hidden</SelectItem>
                          <SelectItem value="toHaveCount">Has Count</SelectItem>
                          <SelectItem value="toHaveAttribute">Has Attribute</SelectItem>
                          <SelectItem value="toHaveURL">Has URL</SelectItem>
                          <SelectItem value="toHaveTitle">Has Title</SelectItem>
                        </SelectContent>
                      </Select>
                      {!['toHaveURL', 'toHaveTitle'].includes(vm.newMethod) && (
                        <Input
                          className="h-7 flex-1 text-xs"
                          placeholder="CSS selector (e.g. table tbody tr)"
                          value={vm.newSelector}
                          onChange={(e) => vm.setNewSelector(e.target.value)}
                        />
                      )}
                      {vm.newMethod === 'toHaveAttribute' && (
                        <Input
                          className="h-7 w-32 text-xs"
                          placeholder="Attribute name"
                          value={vm.newAttribute}
                          onChange={(e) => vm.setNewAttribute(e.target.value)}
                        />
                      )}
                      {!['toBeVisible', 'toBeHidden'].includes(vm.newMethod) && (
                        <Input
                          className="h-7 flex-1 text-xs"
                          placeholder="Expected value"
                          value={vm.newExpected}
                          onChange={(e) => vm.setNewExpected(e.target.value)}
                        />
                      )}
                    </Flex>
                    <Button
                      size="sm"
                      onClick={vm.handleAddAssertion}
                    >
                      Add
                    </Button>
                  </Stack>
                ) : null}

                {vm.suggestions.length > 0 ? (
                  <Stack gap="sm">
                    <Text size="sm" variant="muted">
                      Check the assertions to include. Click to edit selector or expected value.
                    </Text>
                    {vm.suggestions.map((s, i) => (
                      <Flex
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${s.selector}-${s.assertMethod}-${i}`}
                        align="start"
                        className="gap-2 text-sm"
                      >
                        <Checkbox
                          checked={s.accepted}
                          className="mt-0.5"
                          onCheckedChange={(checked) => vm.toggleSuggestionAccepted(i, checked)}
                        />
                        <Stack className="flex-1" gap="sm">
                          <Text variant="muted">{s.description}</Text>
                          {s.accepted ? (
                            <Flex gap="sm" wrap="wrap">
                              {!['toHaveURL', 'toHaveTitle'].includes(s.assertMethod) && (
                                <Input
                                  className="h-6 w-48 text-xs"
                                  placeholder="Selector"
                                  value={s.selector}
                                  onChange={(e) => vm.updateSuggestionSelector(i, e.target.value)}
                                />
                              )}
                              {!['toBeVisible', 'toBeHidden'].includes(s.assertMethod) && (
                                <Input
                                  className="h-6 flex-1 text-xs"
                                  placeholder="Expected"
                                  value={s.expected}
                                  onChange={(e) => vm.updateSuggestionExpected(i, e.target.value)}
                                />
                              )}
                            </Flex>
                          ) : null}
                        </Stack>
                      </Flex>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
              <Stack gap="sm">
                <Label>Test Directory</Label>
                <Input
                  placeholder="tests"
                  value={vm.testDir}
                  onChange={(e) => vm.setTestDir(e.target.value)}
                />
              </Stack>
            </Stack>
          </TabsContent>

          {/* Tab 2: Spec File */}
          <TabsContent className="min-h-0 flex-1 pt-4" value="spec">
            <ScrollArea className="h-full">
              <Code className="block whitespace-pre-wrap break-words rounded-md border border-border bg-bg-surface p-4">
                {vm.specPreview}
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
                      {'selector' in s.step ? s.step.selector : '\u2014'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {'value' in s.step ? s.step.value : '\u2014'}
                    </TableCell>
                    <TableCell>
                      {'context' in s.step && s.step.context ? s.step.context.tagName : '\u2014'}
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
          <Button disabled={!vm.name.trim() || vm.saving} onClick={vm.handleSave}>
            {vm.saving ? 'Saving...' : 'Save Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
