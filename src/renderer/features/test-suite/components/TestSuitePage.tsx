import { BarChart3, Blocks, FileCode, List, PlayCircle, Camera, Upload } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteShortcuts } from '../hooks/useTestSuiteShortcuts';
import { useTestSuiteStore } from '../test-suite-store';

import { AnalyticsPanel } from './AnalyticsPanel';
import { ExportPanel } from './ExportPanel';
import { LibraryPanel } from './LibraryPanel';
import { RecordingPanel } from './RecordingPanel';
import { ResultsPanel } from './ResultsPanel';
import { ScreenshotsPanel } from './ScreenshotsPanel';
import { SetupCard } from './SetupCard';
import { SharedStepsPanel } from './SharedStepsPanel';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';

const TABS = [
  { id: 'recording' as const, label: 'Recording', icon: PlayCircle },
  { id: 'library' as const, label: 'Library', icon: List },
  { id: 'results' as const, label: 'Results', icon: FileCode },
  { id: 'screenshots' as const, label: 'Screenshots', icon: Camera },
  { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'shared-steps' as const, label: 'Shared Steps', icon: Blocks },
  { id: 'export' as const, label: 'CI Export', icon: Upload },
];

export function TestSuitePage() {
  const { projectId } = useLooseParams();
  const { data: config, isLoading } = useTestSuiteConfig(projectId);
  const { activeTab, setActiveTab } = useTestSuiteStore();

  useTestSuiteShortcuts();

  if (!projectId) {
    return (
      <PageLayout>
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title>Test Suite</PageHeader.Title>
          </PageHeader.Row>
        </PageHeader>
        <PageContent>
          <div className="p-6 text-text-muted">No project selected.</div>
        </PageContent>
      </PageLayout>
    );
  }

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
        <PageHeader.TabContent value="analytics"><AnalyticsPanel /></PageHeader.TabContent>
        <PageHeader.TabContent value="shared-steps"><SharedStepsPanel /></PageHeader.TabContent>
        <PageHeader.TabContent value="export"><ExportPanel /></PageHeader.TabContent>
      </PageHeader.Tabs>
      <ShortcutHelpDialog />
    </PageLayout>
  );
}
