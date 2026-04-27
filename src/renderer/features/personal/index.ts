/**
 * Personal route shell — public API
 *
 * Exports the route-level components and store only.
 * Sub-features (notes, alerts, fitness, planner, briefing, changelog)
 * are now top-level features and must be imported directly:
 *   import { useCreateNote } from '@features/notes'
 *   import { AlertsPage } from '@features/alerts'
 *   etc.
 */

// Store
export { usePersonalStore } from './store';

// Route component
export { PersonalPage } from './components/PersonalPage';
