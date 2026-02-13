/**
 * Screen Capture Service — Desktop capturer for screenshots
 *
 * Uses Electron's desktopCapturer API to capture screens and windows.
 * On macOS, requires screen recording permission.
 */

import { desktopCapturer, systemPreferences } from 'electron';

import type { ScreenPermissionStatus, ScreenSource, Screenshot } from '@shared/types';

export interface ScreenCaptureService {
  listSources: (options?: {
    types?: Array<'screen' | 'window'>;
    thumbnailSize?: { width: number; height: number };
  }) => Promise<ScreenSource[]>;
  capture: (
    sourceId: string,
    options?: {
      width?: number;
      height?: number;
    },
  ) => Promise<Screenshot>;
  checkPermission: () => { status: ScreenPermissionStatus; platform: string };
}

const DEFAULT_THUMBNAIL_SIZE = { width: 150, height: 150 };
const DEFAULT_CAPTURE_SIZE = { width: 1920, height: 1080 };

export function createScreenCaptureService(): ScreenCaptureService {
  // Cache sources for quick lookup during capture
  let cachedSources = new Map<string, Electron.DesktopCapturerSource>();

  return {
    async listSources(options) {
      const types = options?.types ?? ['screen', 'window'];
      const thumbnailSize = options?.thumbnailSize ?? DEFAULT_THUMBNAIL_SIZE;

      const sources = await desktopCapturer.getSources({
        types,
        thumbnailSize,
        fetchWindowIcons: true,
      });

      // Update cache
      cachedSources = new Map<string, Electron.DesktopCapturerSource>();
      for (const source of sources) {
        cachedSources.set(source.id, source);
      }

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        display_id: source.display_id,
        appIcon: source.appIcon.toDataURL(),
      }));
    },

    async capture(sourceId, options) {
      const { width = DEFAULT_CAPTURE_SIZE.width, height = DEFAULT_CAPTURE_SIZE.height } =
        options ?? {};

      // Get fresh sources with full resolution
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width, height },
        fetchWindowIcons: true,
      });

      const source = sources.find((s) => s.id === sourceId);
      if (!source) {
        throw new Error(`Screen source not found: ${sourceId}`);
      }

      const { thumbnail } = source;
      const { width: capturedWidth, height: capturedHeight } = thumbnail.getSize();

      const screenshot: Screenshot = {
        data: thumbnail.toDataURL(),
        timestamp: new Date().toISOString(),
        source: {
          id: source.id,
          name: source.name,
          thumbnail: thumbnail.toDataURL(),
          display_id: source.display_id,
          appIcon: source.appIcon.toDataURL(),
        },
        width: capturedWidth,
        height: capturedHeight,
      };

      return screenshot;
    },

    checkPermission() {
      const { platform } = process;

      // Screen recording permission is only relevant on macOS
      if (platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('screen');
        return {
          status: status as ScreenPermissionStatus,
          platform,
        };
      }

      // On Windows and Linux, permission is generally granted by default
      return {
        status: 'granted' as ScreenPermissionStatus,
        platform,
      };
    },
  };
}
