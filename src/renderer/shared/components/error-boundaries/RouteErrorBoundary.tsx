/**
 * RouteErrorBoundary -- Route-level error card
 *
 * Wraps <Outlet /> in RootLayout so the sidebar, command bar, and title bar
 * remain functional when a page-level render error occurs.
 * Accepts a `resetKey` prop (current route path) so state resets on navigation.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { AlertOctagon, ArrowLeft, ClipboardCopy, RotateCcw } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────

interface RouteErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

// ─── Error Boundary ────────────────────────────────────────────

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  static displayName = 'RouteErrorBoundary';

  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Readonly<RouteErrorBoundaryProps>): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, copied: false });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    void window.api.invoke('app.reportRendererError', {
      severity: 'error',
      tier: 'app',
      category: 'renderer',
      message: error.message,
      stack: [error.stack, errorInfo.componentStack].filter(Boolean).join('\n'),
      route: this.props.resetKey,
    });
  }

  handleNavigateDashboard = (): void => {
    window.location.hash = '/dashboard';
    window.location.reload();
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, copied: false });
  };

  handleCopy = (): void => {
    const { error } = this.state;
    const details = [
      `Error: ${error?.message ?? 'Unknown error'}`,
      `Route: ${this.props.resetKey}`,
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
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="border-border bg-card flex max-w-lg flex-col items-center gap-5 rounded-lg border p-8 text-center shadow-sm">
            <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertOctagon aria-hidden="true" className="text-destructive h-6 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-foreground text-lg font-semibold">
                This page encountered an error
              </h2>
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message ??
                  'An unexpected error occurred while rendering this page.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                type="button"
                onClick={this.handleNavigateDashboard}
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Go to Dashboard
              </button>
              <button
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                type="button"
                onClick={this.handleRetry}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Retry
              </button>
            </div>
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
