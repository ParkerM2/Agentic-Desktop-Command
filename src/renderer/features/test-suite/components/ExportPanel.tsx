import { useCallback, useState } from 'react';

import { Download, Eye, FileCode, FolderTree } from 'lucide-react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useLooseParams } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';
import { useToastStore } from '@renderer/shared/stores/toast-store';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Flex,
  PageContent,
  Text,
} from '@ui';

import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';

export function ExportPanel() {
  const { projectId } = useLooseParams();
  const { data: config } = useTestSuiteConfig(projectId);
  const { data: scripts } = useTestSuiteScripts(projectId);

  const [yamlPreview, setYamlPreview] = useState('');
  const [filePath, setFilePath] = useState('');
  const [fileExists, setFileExists] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const rawTestDir = config?.testDirectory ?? 'tests/e2e';
  const testDir = rawTestDir.replace(/\/+$/, '');
  const scriptCount = scripts?.length ?? 0;

  const addToast = useToastStore((s) => s.addToast);

  const handlePreview = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await ipc(TEST_SUITE.EXPORT['CI-PREVIEW'], { projectId });
      setYamlPreview(result.yaml);
      setFilePath(result.filePath);
      setFileExists(result.exists);
      setDialogOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addToast(`Failed to preview CI workflow: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, addToast]);

  const handleCommit = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await ipc(TEST_SUITE.EXPORT['CI-COMMIT'], { projectId });
      if (result.committed) {
        setCommitted(true);
        setFilePath(result.filePath);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addToast(`Failed to commit CI workflow: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, addToast]);

  return (
    <PageContent>
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
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
                {fileExists ? (
                  <Text className="text-text-warning" size="sm">(exists)</Text>
                ) : null}
              </Flex>
            </div>

            {committed ? (
              <Text className="rounded-md border border-border-success bg-surface-success/10 p-3" size="sm" variant="success">
                Workflow file written to {filePath}
              </Text>
            ) : null}

            <Flex gap="sm">
              <Button
                disabled={loading || !projectId}
                size="sm"
                variant="outline"
                onClick={handlePreview}
              >
                <Eye className="mr-1.5 size-3.5" />
                Preview YAML
              </Button>
              <Button
                disabled={loading || !projectId}
                size="sm"
                variant="primary"
                onClick={handleCommit}
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
            <dl className="space-y-3 text-sm">
              <Flex justify="between">
                <dt className="text-text-muted">Trigger</dt>
                <dd className="font-medium text-text-primary">pull_request</dd>
              </Flex>
              <Flex justify="between">
                <dt className="text-text-muted">Paths</dt>
                <dd className="font-medium text-text-primary">
                  {`${testDir}/**, src/**`}
                </dd>
              </Flex>
              <Flex justify="between">
                <dt className="text-text-muted">Runner</dt>
                <dd className="font-medium text-text-primary">ubuntu-latest</dd>
              </Flex>
              <Flex justify="between">
                <dt className="text-text-muted">Node Version</dt>
                <dd className="font-medium text-text-primary">22</dd>
              </Flex>
              <Flex justify="between">
                <dt className="text-text-muted">Artifacts</dt>
                <dd className="font-medium text-text-primary">
                  {testDir}/screenshots/, playwright-report/
                </dd>
              </Flex>
              <Flex justify="between">
                <dt className="text-text-muted">Tests Included</dt>
                <dd className="font-medium text-text-primary">
                  {scriptCount} {scriptCount === 1 ? 'script' : 'scripts'}
                </dd>
              </Flex>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* YAML Preview Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow YAML Preview</DialogTitle>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md border border-border bg-surface-base p-4 font-mono text-xs leading-relaxed">
            {yamlPreview}
          </pre>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
