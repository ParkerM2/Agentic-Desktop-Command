/**
 * GitPage — Combined source control and changelog view
 *
 * Uses PageHeader with ChangelogSummary in the actions area
 * and GitHubPage as the main content body.
 */

import { PageContent, PageHeader, PageLayout } from '@ui';

import { GitHubPanel } from '@features/integrations';

import { ChangelogSummary } from './ChangelogSummary';

export function GitPage() {
  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Source control and changelog">
            Git
          </PageHeader.Title>
          <PageHeader.Actions>
            <ChangelogSummary />
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>
      <PageContent>
        <GitHubPanel />
      </PageContent>
    </PageLayout>
  );
}
