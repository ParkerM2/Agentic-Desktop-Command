/**
 * FeatureErrorBoundary -- Feature-level error card
 *
 * Wraps individual feature components (e.g., TaskDataGrid, AgentDashboard).
 * Shows a smaller error card with "Retry" and "Copy Error Details" while
 * the rest of the page layout stays alive.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { AlertCircle, ClipboardCopy, RotateCcw } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
}

interface FeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

// ─── Error Boundary ────────────────────────────────────────────

export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  static displayName = 'FeatureErrorBoundary';

  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<FeatureErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    void window.api.invoke('app.reportRendererError', {
      severity: 'error',
      tier: 'app',
      category: 'renderer',
      message: `[${this.props.featureName}] ${error.message}`,
      stack: [error.stack, errorInfo.componentStack].filter(Boolean).join('\n'),
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, copied: false });
  };

  handleCopy = (): void => {
    const { error } = this.state;
    const details = [
      `Feature: ${this.props.featureName}`,
      `Error: ${error?.message ?? 'Unknown error'}`,
      '',
      error?.stack ?? 'No stack trace available',
    ].join('\n');
    void navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => {
      this.setState({ copied: false });
    }, 2000);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="border-border bg-card flex flex-col items-center gap-4 rounded-lg border p-6 text-center">
          <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full">
            <AlertCircle aria-hidden="true" className="text-destructive h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-sm font-semibold">
              Failed to load {this.props.featureName}
            </h3>
            <p className="text-muted-foreground text-xs">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              type="button"
              onClick={this.handleRetry}
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Retry
            </button>
            <button
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
              type="button"
              onClick={this.handleCopy}
            >
              <ClipboardCopy aria-hidden="true" className="h-3.5 w-3.5" />
              {this.state.copied ? 'Copied' : 'Copy Error Details'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
