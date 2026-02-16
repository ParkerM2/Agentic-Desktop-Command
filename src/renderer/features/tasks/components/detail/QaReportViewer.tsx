/**
 * QaReportViewer — Displays QA report results with verification suite,
 * issues list, screenshot gallery, and re-run buttons.
 */

import { useState } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { cn, formatDuration } from '@renderer/shared/lib/utils';

import { useQaReport, useStartFullQa, useStartQuietQa } from '../../api/useQaMutations';

interface QaReportViewerProps {
  taskId: string;
}

type VerificationStatus = 'pass' | 'fail';

function VerificationBadge({ label, status }: { label: string; status: VerificationStatus }) {
  const isPassing = status === 'pass';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
        isPassing ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
      )}
    >
      {isPassing ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

const SEVERITY_CONFIG = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Critical' },
  major: { color: 'text-warning', bg: 'bg-warning/10', label: 'Major' },
  minor: { color: 'text-info', bg: 'bg-info/10', label: 'Minor' },
  cosmetic: { color: 'text-muted-foreground', bg: 'bg-muted/30', label: 'Cosmetic' },
} as const;

function IssueSeverityBadge({ severity }: { severity: keyof typeof SEVERITY_CONFIG }) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', config.bg, config.color)}>
      {config.label}
    </span>
  );
}

export function QaReportViewer({ taskId }: QaReportViewerProps) {
  const { data: report, isLoading } = useQaReport(taskId);
  const startQuiet = useStartQuietQa();
  const startFull = useStartFullQa();
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-xs italic">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 animate-pulse" />
        <span>Loading QA report...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-xs italic">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>No QA report available</span>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-muted hover:bg-muted/80 text-foreground inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
            disabled={startQuiet.isPending}
            type="button"
            onClick={() => startQuiet.mutate({ taskId })}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Run Quiet QA
          </button>
          <button
            className="bg-muted hover:bg-muted/80 text-foreground inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
            disabled={startFull.isPending}
            type="button"
            onClick={() => startFull.mutate({ taskId })}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Run Full QA
          </button>
        </div>
      </div>
    );
  }

  const resultConfig = {
    pass: { icon: CheckCircle2, color: 'text-success', label: 'PASSED' },
    fail: { icon: XCircle, color: 'text-destructive', label: 'FAILED' },
    warnings: { icon: AlertTriangle, color: 'text-warning', label: 'WARNINGS' },
  } as const;

  const { icon: ResultIcon, color: resultColor, label: resultLabel } = resultConfig[report.result];

  const criticalCount = report.issues.filter((i) => i.severity === 'critical').length;
  const majorCount = report.issues.filter((i) => i.severity === 'major').length;
  const minorCount = report.issues.filter((i) => i.severity === 'minor').length;
  const cosmeticCount = report.issues.filter((i) => i.severity === 'cosmetic').length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ResultIcon className={cn('h-4 w-4', resultColor)} />
          <span className={cn('text-sm font-semibold', resultColor)}>
            {resultLabel}
          </span>
          <span className="text-muted-foreground text-xs">
            ({report.checksPassed}/{report.checksRun} checks)
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {formatDuration(report.duration)}
        </div>
      </div>

      {/* Verification Suite */}
      <div className="border-border rounded border p-2">
        <div className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-wider">
          Verification Suite
        </div>
        <div className="flex flex-wrap gap-1.5">
          <VerificationBadge label="lint" status={report.verificationSuite.lint} />
          <VerificationBadge label="typecheck" status={report.verificationSuite.typecheck} />
          <VerificationBadge label="test" status={report.verificationSuite.test} />
          <VerificationBadge label="build" status={report.verificationSuite.build} />
          <VerificationBadge label="docs" status={report.verificationSuite.docs} />
        </div>
      </div>

      {/* Issues */}
      {report.issues.length > 0 ? (
        <div className="border-border rounded border p-2">
          <div className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-wider">
            Issues ({criticalCount} critical, {majorCount} major, {minorCount} minor, {cosmeticCount} cosmetic)
          </div>
          <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
            {report.issues.map((issue, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key -- issues list is static after report generation
                key={index}
                className="flex items-start gap-2 text-xs"
              >
                <IssueSeverityBadge severity={issue.severity} />
                <span className="text-foreground">{issue.description}</span>
                {issue.location ? (
                  <span className="text-muted-foreground shrink-0">@ {issue.location}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Screenshots */}
      {report.screenshots.length > 0 ? (
        <div className="border-border rounded border p-2">
          <div className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
            <Image className="h-3 w-3" />
            Screenshots ({report.screenshots.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {report.screenshots.map((screenshot) => (
              <button
                key={screenshot.path}
                className="bg-muted/50 hover:bg-muted border-border flex flex-col items-center gap-1 rounded border p-1.5 transition-colors"
                title={screenshot.label}
                type="button"
                onClick={() => {
                  setExpandedScreenshot(
                    expandedScreenshot === screenshot.path ? null : screenshot.path,
                  );
                }}
              >
                <Image className="text-muted-foreground h-6 w-6" />
                <span className="max-w-[80px] truncate text-[10px]">{screenshot.label}</span>
              </button>
            ))}
          </div>
          {expandedScreenshot ? (
            <div className="bg-muted/30 border-border mt-2 rounded border p-2">
              <div className="text-muted-foreground text-xs">
                Screenshot: {expandedScreenshot}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Re-run buttons */}
      <div className="flex gap-2">
        <button
          className="bg-muted hover:bg-muted/80 text-foreground inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
          disabled={startQuiet.isPending}
          type="button"
          onClick={() => startQuiet.mutate({ taskId })}
        >
          <PlayCircle className="h-3.5 w-3.5" />
          Re-run Quiet QA
        </button>
        <button
          className="bg-muted hover:bg-muted/80 text-foreground inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
          disabled={startFull.isPending}
          type="button"
          onClick={() => startFull.mutate({ taskId })}
        >
          <PlayCircle className="h-3.5 w-3.5" />
          Re-run Full QA
        </button>
      </div>
    </div>
  );
}
