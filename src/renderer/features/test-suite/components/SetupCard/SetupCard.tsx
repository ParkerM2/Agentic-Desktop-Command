import type { TestSuiteConfig } from '@shared/ipc/test-suite';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Flex,
  Grid,
  Input,
  Label,
  PageContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from '@ui';

import {
  MIN_VIEWPORT_HEIGHT,
  MIN_VIEWPORT_WIDTH,
  SCREENSHOT_MODES,
} from '../../lib/constants';

import { useSetupCard } from './useSetupCard';

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

interface SetupCardProps {
  projectId: string;
}

export function SetupCard({ projectId }: SetupCardProps) {
  const vm = useSetupCard(projectId);

  return (
    <PageContent>
      <Card className="mx-auto w-full max-w-[560px]">
        <CardHeader>
          <CardTitle>Set up your test suite</CardTitle>
          <CardDescription>
            Configure the target app and viewport for recording tests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={vm.handleSubmit}>
            <Stack gap="sm">
              <Label htmlFor="setup-target-url">Target URL</Label>
              <Input
                required
                id="setup-target-url"
                placeholder="http://localhost:3000"
                type="url"
                value={vm.targetUrl}
                onChange={(event) => vm.setTargetUrl(event.target.value)}
              />
              {vm.urlError ? (
                <Text size="sm" variant="error">{vm.urlError}</Text>
              ) : null}
            </Stack>

            <Grid cols={2} gap="md">
              <Stack gap="sm">
                <Label htmlFor="setup-viewport-width">Width</Label>
                <Input
                  required
                  id="setup-viewport-width"
                  min={MIN_VIEWPORT_WIDTH}
                  type="number"
                  value={vm.width}
                  onChange={(event) => vm.setWidth(Number(event.target.value))}
                />
              </Stack>
              <Stack gap="sm">
                <Label htmlFor="setup-viewport-height">Height</Label>
                <Input
                  required
                  id="setup-viewport-height"
                  min={MIN_VIEWPORT_HEIGHT}
                  type="number"
                  value={vm.height}
                  onChange={(event) => vm.setHeight(Number(event.target.value))}
                />
              </Stack>
            </Grid>

            <Stack gap="sm">
              <Label htmlFor="setup-screenshot-mode">Screenshot Mode</Label>
              <Select
                value={vm.mode}
                onValueChange={(value) => vm.setMode(value as ScreenshotMode)}
              >
                <SelectTrigger aria-label="Screenshot mode" id="setup-screenshot-mode">
                  <SelectValue placeholder="Select a mode" />
                </SelectTrigger>
                <SelectContent>
                  {SCREENSHOT_MODES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Stack>

            <Stack gap="sm">
              <Label htmlFor="setup-test-directory">Test Directory</Label>
              <Input
                required
                id="setup-test-directory"
                type="text"
                value={vm.testDirectory}
                onChange={(event) => vm.setTestDirectory(event.target.value)}
              />
            </Stack>

            {vm.setupStatus ? (
              <Text variant="muted">{vm.setupStatus}</Text>
            ) : null}

            <Flex justify="end">
              <Button disabled={vm.isSettingUp || vm.saving} type="submit">
                {vm.buttonLabel}
              </Button>
            </Flex>
          </form>
        </CardContent>
      </Card>
    </PageContent>
  );
}
