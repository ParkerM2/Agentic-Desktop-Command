/**
 * QaPanel — QA session results display
 *
 * Shows verdict badge, verification suite grid, issues list,
 * and session stats (checks run/passed, duration).
 */

import { CheckCircle2, Minus, ShieldCheck, XCircle } from 'lucide-react';

import type {
  QaDashboardIssue,
  QaDashboardSession,
  QaVerdict,
  QaVerificationStatus,
} from '@shared/types/agent-dashboard';

import { cn } from '@renderer/shared/lib/utils';

import { Badge, Card, CardContent, ScrollArea } from '@ui';

import { useQaSession } from '../api/useQaSession';
import { useQaEvents } from '../hooks/useQaEvents';

// ─── Props ─────────────────────────────────────────────────

interface QaPanelProps {
  taskId?: string;
  className?: string;
}

// ─── Helpers ───────────────────────────────────────────────

type BadgeVariant = 'success' | 'destructive' | 'warning' | 'secondary' | 'outline' | 'info';

function getVerdictVariant(verdict: QaVerdict): BadgeVariant {
  if (verdict === 'pass') return 'success';
  if (verdict === 'fail') return 'destructive';
  if (verdict === 'warnings') return 'warning';
  if (verdict === 'running') return 'info';
  return 'outline';
}

function getVerdictLabel(verdict: QaVerdict): string {
  if (verdict === 'pass') return 'Pass';
  if (verdict === 'fail') return 'Fail';
  if (verdict === 'warnings') return 'Warnings';
  if (verdict === 'running') return 'Running';
  return 'Pending';
}

function getCheckIcon(status: QaVerificationStatus) {
  if (status === 'pass') {
    return <CheckCircle2 className="h-4 w-4 text-success" />;
  }
  if (status === 'fail') {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getSeverityColor(severity: QaDashboardIssue['severity']): string {
  if (severity === 'critical') return 'text-destructive';
  if (severity === 'major') return 'text-warning';
  return 'text-muted-foreground';
}

// ─── Sub-Components ────────────────────────────────────────

const SUITE_CHECKS = ['lint', 'typecheck', 'test', 'build', 'docs'] as const;

function VerificationGrid({ session }: { session: QaDashboardSession }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {SUITE_CHECKS.map((check) => (
        <div key={check} className="flex flex-col items-center gap-1">
          {getCheckIcon(session.verificationSuite[check])}
          <span className="text-xs capitalize text-muted-foreground">{check}</span>
        </div>
      ))}
    </div>
  );
}

function IssuesList({ issues }: { issues: QaDashboardIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        Issues ({String(issues.length)})
      </p>
      {issues.map((issue, idx) => (
        <div key={`${issue.category}-${String(idx)}`} className="flex items-start gap-2 text-xs">
          <span className={cn('mt-0.5 font-medium uppercase', getSeverityColor(issue.severity))}>
            {issue.severity}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground">{issue.description}</p>
            {issue.location !== undefined && issue.location.length > 0 ? (
              <p className="font-mono text-muted-foreground">{issue.location}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────

export function QaPanel({ taskId, className }: QaPanelProps) {
  const { data: session, isLoading } = useQaSession(taskId);

  useQaEvents();

  if (taskId === undefined) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-6 text-muted-foreground', className)}>
        <ShieldCheck className="mb-2 h-6 w-6" />
        <p className="text-xs">No QA data</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-6', className)}>
        <ShieldCheck className="h-5 w-5 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (session === undefined || session === null) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-6 text-muted-foreground', className)}>
        <ShieldCheck className="mb-2 h-6 w-6" />
        <p className="text-xs">No QA data</p>
      </div>
    );
  }

  const durationSec = Math.round(session.duration / 1000);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="space-y-3 p-4">
        {/* Verdict + stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">QA</span>
            <Badge size="sm" variant={getVerdictVariant(session.verdict)}>
              {getVerdictLabel(session.verdict)}
            </Badge>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{String(session.checksPassed)}/{String(session.checksRun)} checks</span>
            <span>{String(durationSec)}s</span>
          </div>
        </div>

        {/* Verification suite grid */}
        <VerificationGrid session={session} />

        {/* Issues */}
        <ScrollArea className="max-h-40">
          <IssuesList issues={session.issues} />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
