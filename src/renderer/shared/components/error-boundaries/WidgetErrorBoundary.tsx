/**
 * WidgetErrorBoundary -- Small widget fallback
 *
 * Wraps isolated widgets (AssistantWidget, SpotifyWidget, etc.).
 * Shows minimal "Failed to load" text with no buttons or modals.
 * Still reports errors to the main process for tracking.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

// ─── Types ─────────────────────────────────────────────────────

interface WidgetErrorBoundaryProps {
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

// ─── Error Boundary ────────────────────────────────────────────

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  static displayName = 'WidgetErrorBoundary';

  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    void window.api.invoke('app.reportRendererError', {
      severity: 'warning',
      tier: 'app',
      category: 'renderer',
      message: error.message,
      stack: [error.stack, errorInfo.componentStack].filter(Boolean).join('\n'),
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <p className="text-muted-foreground p-2 text-xs">Failed to load</p>;
    }
    return this.props.children;
  }
}
