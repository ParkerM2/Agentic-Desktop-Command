import { useParams } from '@tanstack/react-router';
import { FileCode, List, PlayCircle, Camera, Upload } from 'lucide-react';

import { PageHeader, PageLayout } from '@ui';

import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteStore } from '../test-suite-store';

import { ExportPanel } from './ExportPanel';
import { LibraryPanel } from './LibraryPanel';
import { RecordingPanel } from './RecordingPanel';
import { ResultsPanel } from './ResultsPanel';
import { ScreenshotsPanel } from './ScreenshotsPanel';
import { SetupCard } from './SetupCard';

const TABS = [
  { id: 'recording' as const, label: 'Recording', icon: PlayCircle },
  { id: 'library' as const, label: 'Library', icon: List },
  { id: 'results' as const, label: 'Results', icon: FileCode },
  { id: 'screenshots' as const, label: 'Screenshots', icon: Camera },
  { id: 'export' as const, label: 'CI Export', icon: Upload },
];

export function TestSuitePage() {
  const params = useParams({ strict: false }) as unknown as { projectId?: string };
  const projectId = params.projectId ?? '';
  const { data: config, isLoading } = useTestSuiteConfig(projectId);
  const { activeTab, setActiveTab } = useTestSuiteStore();

  if (isLoading) return <PageLayout><div className="p-6">Loading…</div></PageLayout>;
  if (!config) {
    return (
      <PageLayout>
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title description="Set up testing for this project">Test Suite</PageHeader.Title>
          </PageHeader.Row>
        </PageHeader>
        <SetupCard projectId={projectId} />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader.Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title description="Record, run, and export Playwright tests">Test Suite</PageHeader.Title>
          </PageHeader.Row>
          <PageHeader.TabList>
            {TABS.map((t) => (
              <PageHeader.Tab key={t.id} value={t.id}>
                <t.icon className="h-4 w-4" />{t.label}
              </PageHeader.Tab>
            ))}
          </PageHeader.TabList>
        </PageHeader>
        <PageHeader.TabContent value="recording"><RecordingPanel /></PageHeader.TabContent>
        <PageHeader.TabContent value="library"><LibraryPanel /></PageHeader.TabContent>
        <PageHeader.TabContent value="results"><ResultsPanel /></PageHeader.TabContent>
        <PageHeader.TabContent value="screenshots"><ScreenshotsPanel /></PageHeader.TabContent>
        <PageHeader.TabContent value="export"><ExportPanel /></PageHeader.TabContent>
      </PageHeader.Tabs>
    </PageLayout>
  );
}
