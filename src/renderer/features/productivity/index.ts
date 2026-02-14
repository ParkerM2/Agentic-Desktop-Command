/**
 * Productivity feature — public API
 */

// API hooks
export {
  useCalendarEvents,
  useCalendarCreateEvent,
  useCalendarDeleteEvent,
} from './api/useCalendar';
export { calendarKeys, spotifyKeys } from './api/queryKeys';

// Components
export { ProductivityPage } from './components/ProductivityPage';
