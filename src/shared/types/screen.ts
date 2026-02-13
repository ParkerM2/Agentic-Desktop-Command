/**
 * Screen capture related types
 */

/** Represents a capturable screen or window source */
export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
  display_id?: string;
  appIcon?: string;
}

/** Represents a captured screenshot */
export interface Screenshot {
  data: string;
  timestamp: string;
  source: ScreenSource;
  width: number;
  height: number;
}

/** Permission status for screen recording (macOS) */
export type ScreenPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted';
