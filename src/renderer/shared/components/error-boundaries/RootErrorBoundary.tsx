/**
 * RootErrorBoundary -- Full-screen fallback for the entire app
 *
 * Wraps the <RouterProvider> to catch anything that escapes all lower boundaries.
 * Shows a full-screen error page with "Reload App" and "Copy Error Details".
 * Reports errors to the main process via window.api.invoke.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { AlertTriangle, ClipboardCopy, RotateCcw } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────

interface RootErrorBoundaryProps {
  children: ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

// ─── Error Boundary ────────────────────────────────────────────

export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  static displayName = 'RootErrorBoundary';

  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    void window.api.invoke('app.reportRendererError', {
      severity: 'error',
      tier: 'app',
      category: 'renderer',
      message: error.message,
      stack: [error.stack, errorInfo.componentStack].filter(Boolean).join('\n'),
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleCopy = (): void => {
    const { error } = this.state;
    const details = [
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
        <div className="bg-background text-foreground flex h-screen flex-col items-center justify-center p-8">
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
              <AlertTriangle aria-hidden="true" className="text-destructive h-8 w-8" />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-foreground text-2xl font-semibold">Something went wrong</h1>
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message ?? 'An unexpected error occurred.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                type="button"
                onClick={this.handleReload}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Reload App
              </button>
              <button
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                type="button"
                onClick={this.handleCopy}
              >
                <ClipboardCopy aria-hidden="true" className="h-4 w-4" />
                {this.state.copied ? 'Copied' : 'Copy Error Details'}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
