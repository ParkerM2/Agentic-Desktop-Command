/**
 * Productivity feature — public API
 */

// API hooks — Calendar
export {
  useCalendarCreateEvent,
  useCalendarDeleteEvent,
  useCalendarEvents,
} from './api/useCalendar';

// API hooks — Spotify
export {
  useSpotifyAddToQueue,
  useSpotifyNext,
  useSpotifyPause,
  useSpotifyPlay,
  useSpotifyPlayback,
  useSpotifyPrevious,
  useSpotifySearch,
  useSpotifyVolume,
} from './api/useSpotify';

// Query keys
export { calendarKeys, spotifyKeys } from './api/queryKeys';

// Components
export { ProductivityPage } from './components/ProductivityPage';
