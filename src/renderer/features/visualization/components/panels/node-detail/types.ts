/**
 * Shared types and helpers for node detail sub-components.
 */

// ─── Tracking event shape ───────────────────────────────────────────────────

export interface TrackingEvent {
  agent: string | null;
  data: Record<string, unknown>;
  sid: string;
  ts: string;
  type: string;
}

// ─── Status badge variant helper ────────────────────────────────────────────

export function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active': {
      return 'default';
    }
    case 'completed': {
      return 'secondary';
    }
    case 'error': {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
}
