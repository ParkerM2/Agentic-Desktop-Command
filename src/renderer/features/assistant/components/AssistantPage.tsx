/**
 * AssistantPage — Full-page assistant chat view at /assistant
 *
 * Reuses the same WidgetMessageArea and AssistantInputBar as the floating
 * widget, presented in a full page layout with PageLayout/PageHeader/PageContent.
 */

import { useRouterState } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';

import { ROUTES } from '@shared/constants/routes';

import { useLayoutStore } from '@renderer/shared/stores';

import { Button, PageContent, PageHeader, PageLayout, PageHeaderTitle, PageHeaderActions, PageHeaderRow, Separator } from '@ui';

import { useClearHistory, useSendCommand } from '../api/useAssistant';
import { useAssistantEvents } from '../hooks/useAssistantEvents';
import { useAssistantStore } from '../store';

import { AssistantInputBar } from './AssistantInputBar';
import { WidgetMessageArea } from './WidgetMessageArea';

export function AssistantPage() {
  useAssistantEvents();

  const sendCommand = useSendCommand();
  const clearHistory = useClearHistory();
  const responseHistory = useAssistantStore((s) => s.responseHistory);
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function getActiveView(path: string): string {
    if (path.startsWith(ROUTES.PLANNER)) return 'planner';
    if (path.includes('/ideation')) return 'ideation';
    if (path.startsWith(ROUTES.NOTES)) return 'notes';
    if (path.startsWith(ROUTES.FITNESS)) return 'fitness';
    if (path.startsWith(ROUTES.DASHBOARD) || path === ROUTES.INDEX) return 'dashboard';
    return 'default';
  }

  function handleSendCommand(input: string) {
    sendCommand.mutate({
      input,
      context: {
        activeView: getActiveView(pathname),
        activeProjectId: activeProjectId ?? undefined,
      },
    });
  }

  return (
    <PageLayout>
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderTitle>Assistant</PageHeaderTitle>
          {responseHistory.length > 0 ? (
            <PageHeaderActions>
              <Button
                aria-label="Clear history"
                size="sm"
                variant="ghost"
                onClick={() => { clearHistory.mutate(); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </PageHeaderActions>
          ) : null}
        </PageHeaderRow>
      </PageHeader>
      <PageContent className="flex flex-col gap-0 overflow-hidden p-0">
        <div className="flex min-h-0 flex-1 flex-col">
          <WidgetMessageArea />
          <Separator />
          <div className="p-3">
            <AssistantInputBar
              disabled={sendCommand.isPending}
              onSubmit={handleSendCommand}
            />
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
