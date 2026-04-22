import { Download, Eye, FileCode, FolderTree } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Code,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Flex,
  Grid,
  MetadataItem,
  MetadataList,
  PageContent,
  Text,
} from '@ui';

import { useExportPanel } from './useExportPanel';

export function ExportPanel() {
  const vm = useExportPanel();

  return (
    <PageContent>
      <Grid className="p-6" cols={2} gap="lg">
        {/* Left column: File tree + actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="size-4" />
              Export Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-surface-base p-3 font-mono text-sm">
              <Flex align="center" className="text-text-muted" gap="sm">
                <FolderTree className="size-3" />
                .github/
              </Flex>
              <Flex align="center" className="ml-4 text-text-muted" gap="sm">
                <FolderTree className="size-3" />
                workflows/
              </Flex>
              <Flex align="center" className="ml-8 text-text-primary" gap="sm">
                <FileCode className="size-3" />
                test-suite.yml
                {vm.fileExists ? (
                  <Text className="text-text-warning" size="sm">(exists)</Text>
                ) : null}
              </Flex>
            </div>

            {vm.committed ? (
              <Text className="rounded-md border border-border-success bg-surface-success/10 p-3" size="sm" variant="success">
                Workflow file written to {vm.filePath}
              </Text>
            ) : null}

            <Flex gap="sm">
              <Button
                disabled={vm.loading || !vm.projectId}
                size="sm"
                variant="outline"
                onClick={vm.handlePreview}
              >
                <Eye className="mr-1.5 size-3.5" />
                Preview YAML
              </Button>
              <Button
                disabled={vm.loading || !vm.projectId}
                size="sm"
                variant="primary"
                onClick={vm.handleCommit}
              >
                <Download className="mr-1.5 size-3.5" />
                Export &amp; Commit
              </Button>
            </Flex>
          </CardContent>
        </Card>

        {/* Right column: Workflow summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="size-4" />
              Workflow Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MetadataList className="text-sm" variant="stacked">
              <MetadataItem className="justify-between" label="Trigger" value="pull_request" variant="inline" />
              <MetadataItem className="justify-between" label="Paths" value={`${vm.testDir}/**, src/**`} variant="inline" />
              <MetadataItem className="justify-between" label="Runner" value="ubuntu-latest" variant="inline" />
              <MetadataItem className="justify-between" label="Node Version" value="22" variant="inline" />
              <MetadataItem className="justify-between" label="Artifacts" value={`${vm.testDir}/screenshots/, playwright-report/`} variant="inline" />
              <MetadataItem
                className="justify-between"
                label="Tests Included"
                value={`${vm.scriptCount} ${vm.scriptCount === 1 ? 'script' : 'scripts'}`}
                variant="inline"
              />
            </MetadataList>
          </CardContent>
        </Card>
      </Grid>

      {/* YAML Preview Dialog */}
      <Dialog open={vm.dialogOpen} onOpenChange={vm.setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow YAML Preview</DialogTitle>
          </DialogHeader>
          <Code className="max-h-96 overflow-auto">{vm.yamlPreview}</Code>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
