import { Circle, Play, Save, Square } from 'lucide-react';

import {
  Badge,
  Button,
  Flex,
  Input,
  PageContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Stack,
  Text,
} from '@ui';

import { BrowserViewPanel } from '../BrowserViewPanel';
import { SaveRecordingDialog } from '../SaveRecordingDialog';
import { StepList } from '../StepList';

import { useDevServerButton, useRecordingPanel } from './useRecordingPanel';

interface DevServerButtonProps {
  projectId: string;
  serverRunning: boolean;
  activeInstanceId: string | undefined;
}

function DevServerButton({ projectId, serverRunning, activeInstanceId }: DevServerButtonProps) {
  const vm = useDevServerButton({ projectId, serverRunning, activeInstanceId });

  return (
    <>
      <div className={`h-2 w-2 shrink-0 rounded-full ${vm.serverRunning ? 'bg-green-500 animate-pulse' : 'bg-text-muted/30'}`} />
      {vm.serverRunning && vm.activeInstanceId ? (
        <Button className="h-7" size="sm" variant="destructive" onClick={vm.handleStop}>
          <Square className="h-3 w-3" /> Stop Server
        </Button>
      ) : (
        <Button
          className="h-7"
          disabled={vm.startPending}
          size="sm"
          onClick={vm.handleStart}
        >
          <Play className="h-3 w-3" /> Start Server
        </Button>
      )}
    </>
  );
}

export function RecordingPanel() {
  const vm = useRecordingPanel();

  if (!vm.projectId) return null;

  return (
    <PageContent className="flex h-full flex-col overflow-hidden p-1">
      <Stack className="h-full overflow-hidden rounded-md border border-border" gap="none">
      {/* Toolbar */}
      <Flex align="center" className="shrink-0 border-b border-border px-3 py-1.5" gap="sm" wrap="nowrap">
        {vm.configs.length > 0 && vm.activeConfig ? (
          <Select
            value={vm.activeConfig.id}
            onValueChange={vm.onConfigChange}
          >
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue placeholder="Select config..." />
            </SelectTrigger>
            <SelectContent>
              {vm.configs.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Text size="sm" variant="muted">No configs — add one in Settings</Text>
        )}

        {vm.activeConfig ? (
          <Badge className="shrink-0 text-xs" variant="outline">
            {vm.activeConfig.screenshotMode === 'manual' ? 'No Screenshots' : `Screenshots: ${vm.activeConfig.screenshotMode}`}
          </Badge>
        ) : null}

        <DevServerButton
          activeInstanceId={vm.activeInstance?.id}
          projectId={vm.projectId}
          serverRunning={vm.serverRunning}
        />

        <Separator className="mx-1 h-4" orientation="vertical" />

        {vm.recording ? (
          <Button size="sm" variant="destructive" onClick={vm.onStopRecording}>
            <Circle className="h-3.5 w-3.5 fill-current" /> Stop
          </Button>
        ) : (
          <div title={vm.recordTooltip || undefined}>
            <Button disabled={!vm.canRecord} size="sm" onClick={vm.onStartRecording}>
              <Circle className="h-3.5 w-3.5 fill-destructive text-destructive" /> Record
            </Button>
          </div>
        )}

        <Input
          className="h-7 max-w-[200px] flex-1 text-xs"
          placeholder="Test name (optional)..."
          readOnly={vm.recording}
          value={vm.scriptName}
          onChange={(e) => vm.setScriptName(e.target.value)}
        />

        <Flex align="center" className="ml-auto" gap="sm" wrap="nowrap">
          <Button
            disabled={!vm.canSave || vm.saveScriptPending}
            size="sm"
            variant="outline"
            onClick={() => vm.setSaveDialogOpen(true)}
          >
            <Save className="h-3.5 w-3.5" /> Save ({vm.recordedSteps.length})
          </Button>
        </Flex>
      </Flex>

      {/* Main split: steps + browser */}
      <Flex align="stretch" className="flex-1 overflow-hidden" gap="none" wrap="nowrap">
        <Stack className="w-64 shrink-0 overflow-y-auto border-r border-border" gap="none">
          <Flex align="center" className="h-10 shrink-0 border-b border-border px-3" gap="none">
            <Text className="text-xs font-semibold uppercase text-text-muted">
              Steps ({vm.recordedSteps.length})
            </Text>
          </Flex>
          <StepList />
        </Stack>
        <BrowserViewPanel
          height={vm.vh}
          recording={vm.recording}
          serverRunning={vm.serverRunning}
          url={vm.url}
          width={vm.vw}
          onUrlChange={vm.setUrlOverride}
        />
      </Flex>
      </Stack>
      <SaveRecordingDialog
        defaultName={vm.scriptName}
        open={vm.saveDialogOpen}
        projectId={vm.projectId}
        steps={vm.recordedSteps}
        testDirectory={vm.activeConfig?.testDirectory}
        onOpenChange={vm.setSaveDialogOpen}
      />
    </PageContent>
  );
}
